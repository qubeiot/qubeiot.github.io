---
id: index
title: Introduction
sidebar_position: 1
---

## What is Continuous Monitoring?
Continuous Emissions Monitoring (CEM) involves the use of fixed point sensors, often found at the fenceline of a facility that record and transmit environmental data, including wind direction, wind speed, and methane gas concentration at that specific location through time.

### Point Sensors
* Point sensors are devices that measure the concentration of methane at a specific, fixed location.
* As a plume of methane drifts past the sensor's location, the sensor detects an increase in the methane concentration in the air.
* The sensor records this concentration over time, providing a time series of methane levels at that point.

### Localization
* Multiple point sensors are often deployed in a network around a facility.
* By analyzing the concentration data from these sensors in conjunction with wind direction, it's possible to triangulate the specific location of the methane source.
* By analyzing time periods where a sensor *should* see methane based on the wind direction but is not, it is possible to rule out specific potential sources.

For more information about the localization algorithm, see [Localization](/localization).

### Quantification
Quantifying a leak using point sensors can be done by modeling a methane plume as a gaussian distribution using:
* Magnitude of the concentration spikes
* Wind speed
* Distance to the suspected leak source
* Wind variability
* Atmospheric conditions (temperature, pressure & humidity)

Using the concentration readings at the device along with wind speed, we are able to determine what volume of methane is passing by the instrument.

Wind variability and the atmospheric conditions tell us how a plume would disperse through space. With a model of the plume, along with the distance to the suspected leak source, we are able to solve for what size of leak would be required to produce that magnitude of reading the sensors are seeing.