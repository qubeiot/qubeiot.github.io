# Best Practices

## Deployment Planning
Strategic sensor placement is critical for effective real-time methane detection. Even the most advanced sensors will miss leaks if positioned incorrectly. Poor placement is particularly problematic for intermittent or short-duration emissions that can easily evade poorly located devices.

Wind direction and variability fundamentally determines sensor effectiveness, as devices positioned upwind of emissions are essentially useless. While wind patterns can't be controlled, they can be modeled using historical data to predict where methane plumes will likely travel, enabling strategic sensor positioning.

Data-driven deployment tools can analyze site layouts, equipment locations, wind patterns, and terrain to optimize sensor placement. This modeling approach helps operators maximize detection probability and improve emission source localization while working within operational budgets making methane monitoring more reliable and scalable across multiple assets.

For more information on Qube's approach see this article:

* [Qube’s Data Driven Approach to Optimizing Sensor Placement](https://www.qubeiot.com/expert-insights/methane-sensor-placement-optimization)

## Qube Emissions Dashboard
The following article details practical strategies for verifying methane leaks and interrogating alarms produced by the platform, including three key verification techniques: **wind field visualizations**, **gas concentration roses**, and **emissions source heatmaps**. These tools can help operators confirm alarm accuracy before dispatching field teams, ultimately improving response efficiency and reducing false positives in methane leak detection workflows.
* [Interrogating Emissions Using the Qube Platform](https://www.qubeiot.com/expert-insights/interrogating-emissions-using-the-qube-platform)

For a case study describing the use of the Qube Dashboard to detect Incomplete Combustion from gas-fired equipment using Qube's CH4 and CO sensors in tandem, see here:
* [Using Continuous Monitoring to Detect Incomplete Combustion and Reduce Emissions](https://www.qubeiot.com/expert-insights/using-continuous-monitoring-to-detect-incomplete-combustion-and-reduce-emissions)

## Setting up Alarms
Alarms are notifications sent through the Qube platform to key personnel when a potential leak has been detected. Qube’s alarm notifications also provide operators with contextual information such as the largest emitting source during the alarm period, plume composition with max values of all other sensors on the device, and CH4 emission volumes.

There is a potential for Alarm notifications to be ignored if they receive too many (nuisance alarms), or if no emissions are found after investigating an alarm (a false positive). So establishing the right alarm parameters for a facility is essential to driving the appropriate organizational and operational response to leak events. Read this article for more information on setting those thresholds:

* [Establishing Alarm Levels in the Qube Platform](https://www.qubeiot.com/expert-insights/establishing-alarm-levels-in-a-continuous-monitoring-system)

The Qube Dashboard provides alarm configuration options that allow end users to set escalating alarm levels at HI, HI-HI, and CRITICAL thresholds. By using severity-based alarm levels, organizations can improve alarm response workflows, reduce nuisance alarm notifications, and drive positive outcomes for both environmental and operational excellence. More on severity based alarms can be found here:

* [Severity Based Alarm Levels in the Qube Platform](https://www.qubeiot.com/expert-insights/severity-based-alarm-levels-in-the-qube-platform)

## Work Practices
Continuous monitoring systems with localization and quantification algorithms empower operators with the data needed to significantly reduce their emissions, but the data alone isn't how leaks are fixed. The data must be acted on proactively and methodically to realize the benefits of real time emissions data. Efficient response protocols can be reproduced across facilities and teams for maximum benefit to an operator. Through the diligent application of best practices, effective repairs and adjustments, and new workflows that leverage CM data, operators can significantly reduce methane emissions over time and at scale. 

The following article highlights a study about operational practices based on algorithm-generated alerts enabling faster detection, inspection, and repair workflows:

* [A Case for Implementing New Workflows With Continuous Monitoring Systems](https://www.qubeiot.com/expert-insights/a-case-for-implementing-new-workflows-with-continuous-monitoring-systems)

The abstract for the referenced White Paper can be found here:
* [White Paper: Reducing methane emissions: Implementing data science informed operation and maintenance work practices using continuous monitoring technology](https://www.qubeiot.com/expert-insights/spe-data-science-informed-operation-and-maintenance-work-practices-using-continuous-monitoring-technology)

