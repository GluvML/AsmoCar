@echo off
chcp 65001 > nul
title Day ma nguon AtmoCar len GitHub de Build iOS (.IPA)

echo ================================================================
echo        ATMOCAR - DONG BO LEN GITHUB BUILD CLOUD (IPA / APK)
echo ================================================================
echo.
echo Huong dan:
echo 1. Truy cap https://github.com/new tren trinh duyet.
echo 2. Tao mot Repository moi (vi du: atmocar), chon Public hoac Private tuy thich.
echo 3. KHONG tich vao "Add a README file".
echo 4. Copy duong dan repository (vi du: https://github.com/ten-ban/atmocar.git).
echo.
echo ================================================================
echo.

set /p REPO_URL=">> Nhap hoac Dan duong dan GitHub Repository cua ban: "

if "%REPO_URL%"=="" (
    echo [LOI] Ban chua nhap link GitHub! Vui long chay lai file va dan link vao.
    pause
    exit /b
)

echo.
echo [*] Dang kiem tra git...
cd /d "%~dp0"

git branch -M main

git remote remove origin > nul 2>&1
git remote add origin %REPO_URL%

echo [*] Dang chuan bi ma nguon...
git add .
git commit -m "Auto deploy AtmoCar with iOS & Android Cloud CI/CD" > nul 2>&1

echo [*] Dang day len GitHub (co the can dang nhap GitHub lan dau)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo [THANH CONG!] Ma nguon da duoc day len GitHub thanh cong!
    echo ================================================================
    echo.
    echo Cac buoc tiep theo:
    echo 1. Mo trinh duyet vao trang repo GitHub cua ban.
    echo 2. Vao the "Actions" o tren thanh menu.
    echo 3. Ban se thay workflow "Build iOS IPA (AtmoCar)" dang chay tu dong.
    echo 4. Sau khoang 5-8 phut, may ao Mac cua GitHub se build xong file AtmoCar-iOS.ipa.
    echo 5. Nhan vao ban build de tai artifact "AtmoCar-iOS-IPA" ve may tinh!
    echo.
) else (
    echo.
    echo [CANH BAO] Khong the day len GitHub. 
    echo Hay dam bao link GitHub chinh xac va ban da dang nhap quyen GitHub tren may.
    echo.
)

pause
