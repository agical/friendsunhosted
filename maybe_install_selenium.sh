#!/bin/bash
if [ -a node_modules ]; then
    echo "Not creating dir"
    
else
    mkdir node_modules;
fi

if [ -a 'node_modules/selenium-server-standalone-2.25.0.jar' ]; then
    echo 'Not fetching';
else 
    wget http://selenium.googlecode.com/files/selenium-server-standalone-2.25.0.jar;
    mv selenium-server-standalone-2.25.0.jar node_modules
fi
