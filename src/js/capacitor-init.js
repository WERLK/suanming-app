/**
 * capacitor-init.js - Capacitor 原生插件初始化
 * 此文件在 api-config.js 之后、其他业务脚本之前加载
 * 仅在 Capacitor 原生环境（iOS/Android）中执行，浏览器中自动跳过
 */
(function() {
  'use strict';

  // 仅在 Capacitor 原生平台运行
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
    console.log('[Capacitor] Running in browser, skipping native init');
    return;
  }

  var Capacitor = window.Capacitor;
  var platform = Capacitor.getPlatform();

  console.log('[Capacitor] Native platform:', platform);

  // ======== 状态栏 ========
  if (Capacitor.isPluginAvailable('StatusBar')) {
    Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#0f0c29' });
    Capacitor.Plugins.StatusBar.setStyle({ style: 'DARK' });
    console.log('[Capacitor] Status bar configured');
  }

  // ======== 启动屏 ========
  if (Capacitor.isPluginAvailable('SplashScreen')) {
    // 配置了 launchAutoHide: true，这里做延迟兜底隐藏
    setTimeout(function() {
      Capacitor.Plugins.SplashScreen.hide({ fadeOutDuration: 300 });
    }, 2500);
    console.log('[Capacitor] Splash screen hide scheduled');
  }

  // ======== 网络状态监听 ========
  if (Capacitor.isPluginAvailable('Network')) {
    Capacitor.Plugins.Network.getStatus().then(function(status) {
      if (!status.connected) showOfflineBanner();
    });

    Capacitor.Plugins.Network.addListener('networkStatusChange', function(status) {
      if (!status.connected) {
        showOfflineBanner();
      } else {
        hideOfflineBanner();
      }
    });

    console.log('[Capacitor] Network monitoring active');
  }

  // ======== 触觉反馈 ========
  document.addEventListener('DOMContentLoaded', function() {
    // 为主要按钮添加触觉反馈
    var clickTargets = document.querySelectorAll(
      '.submit-btn, .btn-primary, .checkin-btn, .wheel-spin-btn, .ad-claim-btn'
    );
    clickTargets.forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (Capacitor.isPluginAvailable('Haptics')) {
          Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
        }
      });
    });
    console.log('[Capacitor] Haptic feedback attached to', clickTargets.length, 'buttons');
  });

  // ======== Android 返回键 ========
  if (platform === 'android' && Capacitor.isPluginAvailable('App')) {
    Capacitor.Plugins.App.addListener('backButton', function() {
      var currentPath = window.location.pathname;
      // 在首页时，不做任何操作（防止误退出）
      if (currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/index.html')) {
        // 可以选择退出应用：Capacitor.Plugins.App.exitApp();
        return;
      }
      // 其他页面，执行浏览器后退
      if (window.history.length > 1) {
        window.history.back();
      }
    });
    console.log('[Capacitor] Android back button handler registered');
  }

  // ======== 离线横幅 ========
  function showOfflineBanner() {
    if (document.getElementById('capacitor-offline-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'capacitor-offline-banner';
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;' +
      'text-align:center;padding:10px 16px;z-index:99999;font-size:0.85rem;' +
      'font-family:-apple-system,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    banner.textContent = '网络不可用，部分功能受限';
    document.body.insertBefore(banner, document.body.firstChild);

    // 下移页面内容避免遮挡
    document.body.style.paddingTop = '40px';
  }

  function hideOfflineBanner() {
    var banner = document.getElementById('capacitor-offline-banner');
    if (banner) {
      banner.remove();
      document.body.style.paddingTop = '';
    }
  }

  console.log('[Capacitor] Initialization complete');
})();
