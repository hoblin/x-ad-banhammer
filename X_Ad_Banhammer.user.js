// ==UserScript==
// @name         X Ad Banhammer
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Block advertising accounts on Twitter
// @author       https://github.com/hoblin
// @downloadURL  https://github.com/hoblin/x-ad-banhammer/raw/main/X_Ad_Banhammer.user.js
// @updateURL    https://github.com/hoblin/x-ad-banhammer/raw/main/X_Ad_Banhammer.user.js
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function ($) {
  "use strict";

  const DEBUG = false; // Set to false to disable logging
  const maxAttempts = 20; // Number of attempts to find an element before giving up

  let observer;

  function log(...args) {
    if (DEBUG) {
      console.log(...args);
    }
  }

  // Recently after blocking an ad,
  // Twitter has been showing a premium plus offer.
  // This function will decline it.
  function declinePremiumPlus(attempts) {
    log("Declining Premium Plus offer...");
    if (attempts <= 0) {
      log("Premium Plus offer was not found after multiple attempts");
      // Reconnect observer
      setupObserver();
      return;
    }

    // Find <div role="button" with exact text "Maybe later"
    const declineButton = $('div[role="button"]')
      .filter(function () {
        return $(this).text().trim() === "Maybe later";
      })
      .get(0);

    if (declineButton) {
      log("Maybe later button found:", declineButton);
      // Maybe later button found, proceed to the next step
      simulateClick(declineButton);
      // Reconnect observer after final action
      setupObserver();
    } else {
      log("Maybe later button not found, retrying...");
      // Wait for 500ms before retrying
      setTimeout(() => declinePremiumPlus(attempts - 1), 500);
    }
  }

  function confirmBlock(attempts) {
    log("Confirming block...");
    if (attempts <= 0) {
      log("Block not confirmed after multiple attempts");
      // Reconnect observer
      setupObserver();
      return;
    }

    // Find <div role="button" with exact text "Block"
    const confirmationModalButton = $('div[role="button"]')
      .filter(function () {
        return $(this).text().trim() === "Block";
      })
      .get(0);

    if (confirmationModalButton) {
      log("Block button found:", confirmationModalButton);
      // Block button found, proceed to the next step
      simulateClick(confirmationModalButton);
      // Decline Premium Plus offer
      declinePremiumPlus(maxAttempts);
    } else {
      log("Block button not found, retrying...");
      // Wait for 500ms before retrying
      setTimeout(() => confirmBlock(attempts - 1), 500);
    }
  }

  function openMenu(attempts) {
    if (attempts <= 0) {
      log("Menu not opened after multiple attempts");
      // Reconnect observer
      setupObserver();
      return;
    }

    // get menu item div with role="menuitem" containing text starting with "Block"
    const blockOption = $('#layers div[role="menuitem"]')
      .filter(function () {
        return $(this).text().trim().startsWith("Block");
      })
      .get(0);
    if (blockOption) {
      log("Block option found:", blockOption);
      // Block option found, proceed to the next step
      simulateClick(blockOption);
      confirmBlock(maxAttempts);
    } else {
      log("Block option not found, retrying...");
      // Wait for 500ms before retrying
      setTimeout(() => openMenu(attempts - 1), 500);
    }
  }

  function findMenuButton(adSpan, attempts) {
    if (attempts <= 0) {
      log("Menu button not found after multiple attempts");
      // Reconnect observer
      setupObserver();
      return;
    }

    const menuButton = $(adSpan)
      .parent()
      .parent()
      .find('div[aria-label="More"][role="button"]')
      .get(0);
    if (menuButton) {
      // Menu button found, proceed to the next step
      log("Menu button found:", menuButton);
      simulateClick(menuButton);
      openMenu(maxAttempts);
    } else {
      log("Menu button not found, retrying...");
      // Wait for 500ms before retrying
      setTimeout(() => findMenuButton(adSpan, attempts - 1), 500);
    }
  }

  function simulateClick(element) {
    log("Simulating click on element:", element);
    const event = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  }

  function blockAd(adSpan) {
    log("Blocking ad:", adSpan);

    // extract the username text from the link to the user's profile
    const username = $(adSpan)
      .parent()
      .parent()
      .parent()
      .parent()
      .find('a[role="link"]')
      .first()
      .text()
      .trim();
    console.log("Blocking user:", username);

    // Disconnect observer to prevent loop
    observer.disconnect();

    // Mark the ad as being processed to avoid re-processing it
    $(adSpan).text("Ad - deleting");

    findMenuButton(adSpan, maxAttempts);
  }

  function checkForAdsAndBlock() {
    // find <span> with exact text "Ad" inside <div with aria-label starting with "Timeline"
    const ads = $('div[aria-label^="Timeline"] span').filter(function () {
      return $(this).text().trim() === "Ad";
    });
    ads.each(function (index, adSpan) {
      blockAd(adSpan);
    });
  }

  function setupObserver() {
    observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.addedNodes.length) {
          checkForAdsAndBlock();
        }
      }
    });

    observer.observe(document, { childList: true, subtree: true });
  }

  // Initial check for ads
  checkForAdsAndBlock();

  // Set up the observer to check for new ads when the DOM updates
  setupObserver();
})(jQuery);
