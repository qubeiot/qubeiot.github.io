# Metal Oxide Sensors

The core of Qube's methane detection system is a metal oxide (MOX) sensor. MOX sensors detect gases by monitoring changes in their electrical resistance. When heated in air, atmospheric oxygen adsorbs onto the metal oxide surface, capturing electrons and forming an electron-depleted region, which increases the sensor's resistance.

MOX sensors are designed for selectivity to specific gases through careful material choice, catalytic doping, and optimized operating temperatures. When a target gas reacts with the adsorbed oxygen, it releases trapped electrons back into the sensor, thereby decreasing its resistance. This measurable change provides a distinct electrical signal indicating the presence and concentration of that particular gas.

## Why Metal Oxide?
The main advantage of metal oxide sensors is their low cost. Since they are a relatively simple semiconductor circuit that can be mass produced using industry standard screen printing and deposition methods, they can be manufactured in bulk with high reliability and reproducibility. Lowering the cost of each device is important to allow operators to deploy accurate continuous monitoring at more facilities, at a far lower cost than other systems.

## Challenges

MOX sensors do present some challenges which need to be overcome, however:

- They are sensitive to environmental factors like as temperature and humidity.
- Sensor readings can drift from their baseline over time.
- Sensors have a limited lifespan, typically 5-10 years.

To make out-of-the-box MOX sensors suitable for continuous monitoring, Qube has developed a proprietary calibration and auto-baselining algorithm.

## Alternatives

Alternatives methods to detect methane are typically optical, relying on scattering of light at specific wavelengths​. For example, Optical Gas Imaging (OGI), which uses a cooled Infrared camera sensor, or a laser-based technology such as Tunable Diode Laser Absorption Spectroscopy (TDLAS).

Cooled optical sensors and high precision lasers are more expensive than a simple MOX semiconductor circuit and they require higher power consumption which in turn increases the total device cost more. They can also be sensitive to dust, moisture and humidity.