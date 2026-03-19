DEVICE multi_input



LAYER FLOW 

SQUARE CELL TRAP square_cell_trap_1 componentSpacing=1000.0 rotation=0.0 height=250.0 channelWidth=1000.0 channelLength=4000.0 chamberWidth=2500.0 chamberLength=2500.0 chamberHeight=250.0;
PORT port_1 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
MIXER mixer_1 componentSpacing=1000.0 channelWidth=800.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0;
MIXER mixer_2 componentSpacing=1000.0 channelWidth=800.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0;
PORT port_2 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_3 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_4 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_5 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_6 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT port_7 componentSpacing=1000.0 portRadius=700.0 height=1100.0;



CHANNEL channel_1 from square_cell_trap_1 2 to port_1 1 connectionSpacing=1000;
CHANNEL channel_2 from mixer_1 2 to square_cell_trap_1 1 connectionSpacing=1000;
CHANNEL channel_3 from mixer_2 2 to square_cell_trap_1 1 connectionSpacing=1000;
CHANNEL channel_4 from port_2 1 to square_cell_trap_1 1 connectionSpacing=1000;
CHANNEL channel_5 from port_3 1 to mixer_1 1 connectionSpacing=1000;
CHANNEL channel_6 from port_4 1 to square_cell_trap_1 1 connectionSpacing=1000;
CHANNEL channel_7 from port_5 1 to mixer_2 1 connectionSpacing=1000;
CHANNEL channel_8 from port_6 1 to mixer_2 1 connectionSpacing=1000;
CHANNEL channel_9 from port_7 1 to mixer_1 1 connectionSpacing=1000;

 

END LAYER

LAYER CONTROL 

PORT Cport_0 componentSpacing=1000.0 portRadius=700.0 height=1100.0;
PORT Cport_1 componentSpacing=1000.0 portRadius=700.0 height=1100.0;

VALVE valve_0 on channel_4 componentSpacing=1000.0 rotation=0.0 width=1230.0 length=4920.0 height=250.0;
VALVE valve_1 on channel_6 componentSpacing=1000.0 rotation=0.0 width=1230.0 length=4920.0 height=250.0;

CHANNEL Ctrlchannel_0 from Cport_0 1 to valve_0 1 connectionSpacing=1000;
CHANNEL Ctrlchannel_1 from Cport_1 1 to valve_1 1 connectionSpacing=1000;

 

END LAYER

