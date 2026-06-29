DEVICE flow_and_control_demo



LAYER flow

MIXER mixer_1componentSpacing=1000.0 channelWidth=800.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0;
PORT port_1componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_2componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_3componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_4componentSpacing=1000.0 portRadius=700.0 height=1100.0;



CHANNEL channel_1 from mixer_1 2 to port_1 1 connectionSpacing=1000;
CHANNEL channel_2 from port_2 1 to mixer_1 1 connectionSpacing=1000;
CHANNEL channel_3 from port_3 1 to port_1 1 connectionSpacing=1000;
CHANNEL channel_4 from port_4 1 to mixer_1 1 connectionSpacing=1000;

 

END layer

LAYER control

PORT cport_0componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT cport_1componentSpacing=1000.0 portRadius=700.0 height=1100.0;

VALVE valve_0 on channel_1 componentSpacing=1000.0 rotation=0.0 width=1230.0 length=4920.0 height=250.0;
VALVE valve_1 on channel_3 componentSpacing=1000.0 rotation=0.0 width=1230.0 length=4920.0 height=250.0;

CHANNEL ctrlchannel_0 from cport_0 1 to valve_0 1 connectionSpacing=1000;
CHANNEL ctrlchannel_1 from cport_1 1 to valve_1 1 connectionSpacing=1000;

 

END layer

