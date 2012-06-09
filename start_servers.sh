mkdir logs
java -jar node_modules/selenium/lib/runner/selenium-server-standalone-2.20.0.jar -Dwebdriver.chrome.bin="/opt/google/chrome/google-chrome" -Dwebdriver.chrome.driver="/home/daniel/bin/chromedriver" > logs/seleniumserver.log &
cd site/
python -m SimpleHTTPServer > ../logs/httpserver.log &
cd -

