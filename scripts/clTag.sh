#! /bin/bash

CUR_DIR=`dirname $0`

python $CUR_DIR/visionTagging/classifyMain.py --root /mnt/NAS/Photos/ --method clarifai --max_sec 14800
