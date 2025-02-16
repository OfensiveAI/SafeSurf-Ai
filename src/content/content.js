// Import required models
import * as tf from '@tensorflow/tfjs';
import { NsfwJS } from 'nsfwjs';
import { BertTokenizer, BertModel } from '@tensorflow-models/bert';

class SafeSurfContentFilter {
  constructor() {
    this.models = {
      nsfw: null,
      bert: null
    };
    this.settings = null;
    this.initialize();
  }

  async initialize() {
    // Load settings from storage
    this.settings = await chrome.storage.sync.get({
      childSafetyMode: false,
      adBlocking: true,
      blockedCategories: ['adult', 'violence', 'drugs', 'gambling']
    });

    // Initialize models if child safety is enabled
    if (this.settings.childSafetyMode) {
      await this.loadModels();
    }

    // Start content filtering
    this.startFiltering();
  }

  async loadModels() {
    // Load models lazily only when needed
    this.models.nsfw = await tf.loadLayersModel(chrome.runtime.getURL('models/nsfw/model.json'));
    this.models.bert = await tf.loadGraphModel(chrome.runtime.getURL('models/bert/model.json'));
    
    // Warm up models with dummy data
    await this.warmUpModels();
  }

  async scanText(text) {
    if (!this.models.bert) return false;
    
    const tokens = await this.tokenizeText(text);
    const predictions = await this.models.bert.predict(tokens);
    
    return this.evaluateTextPredictions(predictions);
  }

  async scanImage(img) {
    if (!this.models.nsfw) return false;

    // Convert image to tensor
    const tensor = tf.browser.fromPixels(img);
    const predictions = await this.models.nsfw.classify(tensor);
    
    // Cleanup
    tensor.dispose();
    
    return this.evaluateImagePredictions(predictions);
  }

  async filterContent() {
    // Text filtering
    const textNodes = document.evaluate(
      '//text()', document, null, 
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null
    );

    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const node = textNodes.snapshotItem(i);
      if (await this.scanText(node.textContent)) {
        node.textContent = '[Content Filtered]';
      }
    }

    // Image filtering
    const images = document.getElementsByTagName('img');
    for (const img of images) {
      if (await this.scanImage(img)) {
        this.blurImage(img);
      }
    }
  }

  blurImage(img) {
    img.style.filter = 'blur(30px)';
    img.setAttribute('data-safesurf-filtered', 'true');
    
    // Add overlay with warning
    const overlay = document.createElement('div');
    overlay.className = 'safesurf-overlay';
    overlay.textContent = 'Content Filtered';
    img.parentNode.insertBefore(overlay, img.nextSibling);
  }

  blockAds() {
    // Apply EasyList filters
    const adSelectors = this.getEasyListSelectors();
    for (const selector of adSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        this.replaceWithNatureWallpaper(el);
      });
    }
  }

  replaceWithNatureWallpaper(element) {
    const wallpaper = document.createElement('div');
    wallpaper.className = 'safesurf-wallpaper';
    wallpaper.style.backgroundImage = `url(${chrome.runtime.getURL('images/nature/random.svg')})`;
    element.parentNode.replaceChild(wallpaper, element);
  }

  startFiltering() {
    // Initial scan
    this.filterContent();
    
    // Watch for dynamic content
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          this.filterContent();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Handle ad blocking
    if (this.settings.adBlocking) {
      this.blockAds();
    }
  }
}

// Initialize content filter
const filter = new SafeSurfContentFilter();