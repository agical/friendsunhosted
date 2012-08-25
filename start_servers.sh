mkdir logs
java -jar node_modules/selenium-server-standalone-2.25.0.jar -log logs/seleniumserver.log -Dwebdriver.chrome.bin="/opt/google/chrome/google-chrome" -Dwebdriver.chrome.driver="/home/daniel/bin/chromedriver" &
buster server &
cd site/
python -m SimpleHTTPServer > ../logs/httpserver.log &
cd -

