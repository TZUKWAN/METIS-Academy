Y:
cd Y:\apps\desktop
set CSC_IDENTITY_AUTO_DISCOVERY=false
if exist release4\win-unpacked rmdir /s /q release4\win-unpacked
node node_modules\electron-builder\cli.js --win --config electron-builder.yml -c.directories.output=release4 > Y:\apps\desktop\pack-log2.txt 2>&1
