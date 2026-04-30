DEVICE valve

LAYER FLOW
PORT port_1 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_2 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
CHANNEL channel_1 from port_1 1 to port_2 1 connectionSpacing=1600 channelWidth=800 height=250;
END LAYER

LAYER CONTROL
VALVE valve_1 on channel_1 componentSpacing=1000.0 rotation=90.0 width=2400.0 length=2400.0 height=250.0;
END LAYER
