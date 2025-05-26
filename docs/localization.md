---
title: Localization
sidebar_position: 2
---

After data is received from the onsite Qube devices, the first stage of the physics model is to detect any large variations from the baseline methane concentrations. The model uses those elevated readings in concert with the wind direction at that time to determine localization of the leak source.

The localization algorithm is able to filter offsite emissions. See here for more details.

The following simulation is intended as an illustrative example of how localization works. The devices A1, A2, A3, and A4 are located in a rectangular perimeter around 3 potential leak sources represented by black dots. The upwind direction of each device is illustrated with a cone, 30 degree across. Any source upwind of a device while it is detecting elevated readings is given a weighting. The longer and more significant the elevating concentrations, the larger the weighting given. Resultant weightings are averaged over a 10 minute period and the resultant localized leak source is determined.

## Localization Simulation

:::info
Hover on the map to set wind direction and speed, and click the sources to toggle leaks. The bar chart below is showing a simulated view of how the localization algorithm sums up time when a device seeing elevated concentrations is downwind of each source.
:::

<iframe src="/html/localization.html" width="100%" height="700"></iframe>