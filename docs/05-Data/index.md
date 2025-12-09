# Data
Qube devices are low-powered and bandwidth efficient, to maximize data reliability at the lowest possible cost. This design challenge means that data may not appear exactly how you expect.

## Sampling Frequency
During methane releases, it is important for Qube devices to sample gas concentration as quickly as possible to maximize our chances of being able to characterize the leak through time. Sampling as high as once every 2-3 seconds is useful, however it requires a significant data stream, increasing bandwidth requirements and power draw required to send the data.

Instead of sending *all* data to the platform, the device intelligently analyzes the data for any interesting information. In times where CH4 concentration is generally flat, the device saves only the data required to rebuild that straight line through interpolation. In times when methane is present, the compression algorithm saves as many points as needed to rebuild the general shape of the original data stream.

This is what the variable sampling frequency data can look like for CH4 concentration within the Qube Dashboard. Note the higher frequency data during the detected methane spike:

![Animation showing variable frequency](frequency.gif)

## Data Compression Algorithm
Since the devices sample at such a high frequency, the data compression algorithm runs on the device to determine which data points need to be sent. See below for a simplified example of this algorithm in action:

<iframe src="/html/compression.html" width="610px" height="210"></iframe>

## Payload Frequency
Internet-of-Things (IOT) devices typically manage power consumption by reducing the frequency that payloads are sent to the cloud, as powering the LTE modem can be a significant power draw.

Qube devices sample concentration constantly in order not to miss any important signal, no-matter how brief. However, the devices can put the LTE modem to sleep for up to 1-hr, and in the case of a communication failure can store data in its internal buffer for up to 8 hours. This means that data in the platform may be delayed by up to 1 hour, or even longer in the case of communication issues that can happen in areas with low signal strength.

How do we ensure timely delivery of important information? Qube devices *can* wait up to 1 hour, but in the case of any interesting data, the device sends the data to the cloud **immediately**. So that means a spike in methane readings will trigger the system to spring into action so the platform can quantify and potentially alarm *as soon as possible*.