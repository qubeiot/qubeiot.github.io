---
title: Sensors
sidebar_position: 2
---

## Metal Oxide Sensors
The core of Qube's methane detection platform is a metal oxide (MOX) sensor. MOX sensors detect gases by monitoring changes in their electrical resistance. When heated in air, atmospheric oxygen adsorbs onto the metal oxide surface, capturing electrons and forming an electron-depleted region, which increases the sensor's resistance.

MOX sensors are designed for selectivity to specific gases through careful material choice, catalytic doping, and optimized operating temperatures. When a target gas reacts with the adsorbed oxygen, it releases trapped electrons back into the sensor, thereby decreasing its resistance. This measurable change provides a distinct electrical signal indicating the presence and concentration of that particular gas.

## Why Metal Oxide?
The main advantage of metal oxide sensors is their low cost, which allows operators to deploy accurate continuous monitoring at more facilities, at a far lower cost than other systems. However, these sensors do present some challenges which need to be overcome:

- They are sensitive to environmental factors like as temperature and humidity.
- Sensor readings can drift from their baseline over time.
- Sensors have a limited lifespan, typically 5-10 years.

To make out-of-the-box MOX sensors suitable for continuous monitoring, Qube has developed a proprietary calibration and auto-baselining algorithm.

### Alternatives

Alternatives methods to detect methane are typical optical, relying on scattering of light at specific wavelengths​. For example, Optical Gas Imaging (OGI), which uses a cooled Infrared camera sensor, or a laser-based technology such as Tunable Diode Laser Absorption Spectroscopy (TDLAS).

Cooled optical sensors and high precision lasers are more expensive than a simple MOX semiconductor circuit and they require higher power consumption which in turn increases the total device cost more. They can also be sensitive to dust, moisture and humidity.

## Calibration

To accurately measure methane concentration, each sensor undergoes a calibration process. The sensor is exposed to known methane concentrations in a controlled environment and the corresponding voltage drop across the sensor is recorded. This data forms the "calibration curve," which relates voltage output to methane concentration.

The sensor's response is also affected by environmental variables like temperature, humidity, and air pressure. Changes in these conditions alter the calibration curve, transforming it from a simple 2-dimensional curve (voltage vs. concentration) into a multi-dimensional surface. This surface is described by a complex mathematical formula using "calibration coefficients" as inputs.

To map the full extent of the surface accurately, the calibration process is repeated multiple times, varying both gas concentration and the environmental conditions all independently. This results in a unique set of calibration coefficients for each sensor, allowing accurate determination of methane concentration within 1 ppm across a wide range of environmental conditions.

## Validation

Each sensor is lab calibrated to all expected ranges of operating conditions and gas concentrations, with an accuracy of 1 ppm or 1% of the reading, whichever is greater.

While the lab calibration procedure confirms the sensor’s response to highly controlled steady-state concentration values, this level of performance is periodically validated in the field, by measuring real plumes of methane at a controlled release test facility west of Calgary.

The field testing is intended to simulate an actual deployment and a typical emission profile a Qube device is expected to detect and measure. The sensors’ responses are compared against a high-quality reference, a Los Gatos Gas Analyzer (LGA), which is co-located during the test release campaign. The figure below shows an example of methane readings observed during a controlled release test with the two systems co-located:

## Drift 

Metal oxide sensors, while sensitive and reliable, can experience ‘drift’ as they age. This drift occurs when the sensor’s response to methane deviates from its original calibration curve due to environmental impacts on the metal oxide substrate over time. This can be due to microscopic changes to the surface area of the reaction surface as it cracks and moves, or due to poisoning of some reaction sites from contaminants.

Qube has developed a patent-pending auto-baselining algorithm to address this issue. The algorithm runs continuously in the background, detecting and compensating for drift without any human intervention. The algorithm identifies time periods when the air is clean and compares the sensor’s baseline response to the expected background methane level (typically the global average value of 1.9 ppm). If the detected baseline response deviates from this expected background level, the baselining procedure is initiated. If the algorithm determines that the sensor is not in clean air, then it waits for a period when the sensor is in clean air.