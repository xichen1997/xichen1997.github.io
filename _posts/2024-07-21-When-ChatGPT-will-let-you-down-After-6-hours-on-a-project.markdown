---
layout: default
title: 'When ChatGPT will let you down?After 6 hours on a project'
date: 2024-07-21 00:05:14 -0400
categories: 
  - AI
  - programming
  - computer_science
---


# Introduction

Nowadays, chatgpt has been integrated into every aspect of our lives and work. It greatly enhances the capacity not only of the individual developer, but of staff in giant tech. 

It also has great potential in education. In my opinion, it's more like a very, very patient personal teacher that can many strange questions any time and is willing to discuss the details with you. And it possesses almost all human knowledge, akin to Aristotle in 21st centry.

However, as we know, the model is based on "probability", which means it doesn't really understand sentense, but answer our queries with all the data feeded into the model, hided under billions of parameters. So that's why the answer from it can be misleading and prejudiced.

Because it lacks reasoning, it's very hard to say no to queries it doesn't know well. Some times it replies based on old memory, like the bugs under different operating system versions,
leading to confusing answer. That's the hallucination--a slight details can lead a giant error-- is a significant drawback.


Here is my experience using GPT, setting up home assistant operating system on my raspberry pi 5.


# Set up HomeAssistant with raspberry pi

First, I downloaded a specific operating system image and flash it into a SD card, which let the HomeAssistant run without any problem.

However, I found the fan connected to the raspberry pi couldn't response while the temperature is rising. (Raspberry pi 5 peak power reaches 27W, which need active cooling fan).

I guessed it's the operating system doesn't support GPIO control like official image. Then I looked for some workarounds, for example, running the HA(homeassistant) in the docker:

https://github.com/HuckleberryLovesYou/Homeassistant-Supervised-on-Raspberry-Pi-5

But this version is for supervised version, which doesn't have full access or control to the HA, for example, we couldnt' install any addOns in the system.

# Find solution on naive HA system


Then I asked for ChatGPT and Claude about the solution, they both suggest me to go with an addOn which will trigger the GPIO to control the fan.

## local addOns configuration

Adding another addOns are pretty easy but interesting, HA will run docker containers as an addOn, and then the config.yaml will be filtered out as addOn configuration, another Dockerfile should be in the same directory.

```Dockerfile
# Docker file
FROM python:3.9-slim

RUN pip install RPi.GPIO

COPY fan_control.py /app/fan_control.py

CMD ["python", "/app/fan_control.py"]
```


```yaml
name: Fan Control
version: "1.0"
slug: fan_control
description: Control the Raspberry Pi fan.
```

Then I try to launch it and find the addons in addOn store, however, I couldn't find it. I refresh the cache in the browser for 5 mins and couldn't find the new local addOns, then I asked GPT for fix, nothing really helpful.

Then I looked for the documents for HA local addOn configurations, I found:
https://developers.home-assistant.io/docs/add-ons/configuration/#add-on-configuration

There are 5 options are required to make the configuration works:

- name
- version
- slug
- description
- arch

It worked after I added arch.

## setup gpio to control fan

The fan I used was Geeekpi ICE tower fan, I need to control it with GPIO 4.

Then GPT gives me python script to control it:

```python
import RPi.GPIO as GPIO
import time
import os

FAN_PIN = 4
TEMP_THRESHOLD = 70  # in Celsius

GPIO.setmode(GPIO.BCM)
GPIO.setup(FAN_PIN, GPIO.OUT)

def get_cpu_temperature():
    temp = os.popen("vcgencmd measure_temp").readline()
    return float(temp.replace("temp=", "").replace("'C\n", ""))

try:
    while True:
        temp = get_cpu_temperature()
        if temp > TEMP_THRESHOLD:
            GPIO.output(FAN_PIN, True)
        else:
            GPIO.output(FAN_PIN, False)
        time.sleep(5)
except KeyboardInterrupt:
    GPIO.cleanup()

```
However, it didn't work. After checking the logging, I found that RPi.GPIO is not supported. Then I realized it's not official image, may doesn't have the GPIO configuration. Then I asked GPT to have a GPIO mapping, it gives me some suggestions:

1. Adding `privileged=true` in configuration yaml file. 
 which will adding `--privileged` when running the docker.

 2. Mapping the GPIO devices:
`    devices: - "/dev/gpiomem:/dev/gpiomem"`


Both of them doesn't work, then I try to launch these addOns by docker directly(which will save lot of time because doesn't need to wait it generated addOns)

I check the devices under `/dev` and run docker like:
``` zsh
docker run --privileged -it \
  --device /dev/gpiomem:/dev/gpiomem \
  --device /dev/gpiomem0:/dev/gpiomem0 \
  --device /dev/gpiomem1:/dev/gpiomem1 \
  --device /dev/gpiomem2:/dev/gpiomem2 \
  --device /dev/gpiomem3:/dev/gpiomem3 \
  --device /dev/gpiomem4:/dev/gpiomem4 \
  gpio_test_image
```

But it still doesn't work. 

I have spent more than 5 hours on it then, and I was looking for the docs about it.
Then I found some body already talked about it:

https://community.home-assistant.io/t/raspberry-pi-5-gpio-pins-problem/667111

And it's not supported on raspberry pi5, only works under raspberry pi4.

# Reflection 

The LLM can give us lots of information based on the training data. However, it still has many disadvantage. 

### First, hallucination.
 
It will make up some knowledge which doesn't based on prior knowledge. In my case, it made up the knowledge about HA in raspberry pi5. And it can't tell us which one is not possible, and if we should stop trying with current method(lack of reasoning capacity). 

This will lead us spending a lot of time to debug what it tells us, which is much more time consuming. If I knew the raspberry pi5 can't use GPIO with HA I wouldn't try it. 

### Even if it has lots of shortages, we can still use it and learn from it.

For example, I used it and learned how to setup addons in HomeAssistant, which I would almost never touch this area, and it also taught me how to make a docker image with Dockerfile in a understandable and practical way, which is really helpful.

We should take the advantage with LLM to open our horizon and technical stacks, this will provide different point of view when we meet something new.

### Expert will has more advantage

This new technology will benefit the experienced programmer more. Once the LLM provide some solutions or code, the programmer with more experience will know if this is possible or not very quick and give some more detailed instruction to LLM. As we know if we give a more detailed and well-organized description, we will have better output. 

In this case these experts will free their hands from debugs and tedious work and think more deeper and systemically, which greatly increase productivity(Few people could organize a company). 


The LLM is more like a powerful tool. Those with lots of prior knowledge will use it in the best way.