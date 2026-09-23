/**
 * splash.js
 * Quản lý vòng đời Màn hình chờ khởi động (MoMo-Style Splash Screen)
 */
(function() {
    'use strict';

    function initSplashScreen() {
        const splash = document.getElementById('splash-screen');
        if (!splash) return;

        // Cho phép hiển thị tối thiểu 1.8s để người dùng chiêm ngưỡng hoạt ảnh tinh tế
        const minDisplayTime = 1800;
        const startTime = Date.now();

        function dismissSplash() {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minDisplayTime - elapsed);

            setTimeout(() => {
                splash.classList.add('fade-out');
                setTimeout(() => {
                    splash.style.display = 'none';
                    // Phát ra sự kiện báo hiệu app đã vào màn hình chính
                    window.dispatchEvent(new CustomEvent('app:ready'));
                }, 600);
            }, remaining);
        }

        if (document.readyState === 'complete') {
            dismissSplash();
        } else {
            window.addEventListener('load', dismissSplash);
            // Fallback an toàn tối đa 3 giây
            setTimeout(dismissSplash, 3000);
        }
    }

    // Cung cấp hàm xem lại hiệu ứng màn hình chờ bất kỳ lúc nào
    window.previewSplashScreen = function() {
        let splash = document.getElementById('splash-screen');
        if (!splash) return;
        splash.style.display = 'flex';
        // Force reflow
        void splash.offsetWidth;
        splash.classList.remove('fade-out');

        const loaderFill = splash.querySelector('.splash-loader-fill');
        if (loaderFill) {
            loaderFill.style.animation = 'none';
            void loaderFill.offsetWidth;
            loaderFill.style.animation = '';
        }

        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
            }, 600);
        }, 2200);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplashScreen);
    } else {
        initSplashScreen();
    }
})();
