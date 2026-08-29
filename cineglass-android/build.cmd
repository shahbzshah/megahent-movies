@echo off
setlocal
set SDK=C:\Users\User\AppData\Local\Android\Sdk
set BT=%SDK%\build-tools\36.0.0
set PLAT=%SDK%\platforms\android-37\android.jar
set OUT=build
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%;%PATH%

if exist %OUT% rmdir /s /q %OUT%
mkdir %OUT%\classes 2>nul

echo [1/6] aapt2 compile...
call %BT%\aapt2 compile --dir app\src\main\res -o %OUT%\res.zip || exit /b 1

echo [2/6] aapt2 link...
call %BT%\aapt2 link -o %OUT%\base.apk -I "%PLAT%" --manifest app\src\main\AndroidManifest.xml --min-sdk-version 21 --target-sdk-version 34 -A app\src\main\assets %OUT%\res.zip --auto-add-overlay || exit /b 1

echo [3/6] javac...
javac --release 11 -classpath "%PLAT%" -d %OUT%\classes app\src\main\java\app\cineglass\android\MainActivity.java || exit /b 1

echo [4/6] d8 dex...
"%JAVA_HOME%\bin\jar" cf %OUT%\classes.jar -C %OUT%\classes .
mkdir %OUT%\dexout 2>nul
call %BT%\d8.bat --release --lib "%PLAT%" --output %OUT%\dexout %OUT%\classes.jar || exit /b 1
"%JAVA_HOME%\bin\jar" uf %OUT%\base.apk -C %OUT%\dexout classes.dex || exit /b 1

echo [5/6] zipalign...
call %BT%\zipalign -f 4 %OUT%\base.apk %OUT%\aligned.apk || exit /b 1

echo [6/6] apksigner sign...
call %BT%\apksigner sign --ks "%USERPROFILE%\.android\debug.keystore" --ks-pass pass:android --ks-key-alias androiddebugkey --out cineglass.apk %OUT%\aligned.apk || exit /b 1

echo BUILD OK: cineglass.apk
