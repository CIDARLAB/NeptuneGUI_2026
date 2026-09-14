DEVICE Super_Mux_8
LAYER FLOW

H MUX mux_8 1 to 8 leafPitch=4000 flowChannelWidth=500 controlChannelWidth=100 valveWidthX=1800 valveWidthY=500 width=1800 length=500 stageLength=3000;
PORT port_out portRadius=1000;
H BANK port_in of 8 PORT portRadius=1000 spacing=4000;

CHANNEL c_out from port_out 3 to mux_8 1 channelWidth=500;
CHANNEL cin1 from port_in 1 to mux_8 2 channelWidth=500;
CHANNEL cin2 from port_in 2 to mux_8 3 channelWidth=500;
CHANNEL cin3 from port_in 3 to mux_8 4 channelWidth=500;
CHANNEL cin4 from port_in 4 to mux_8 5 channelWidth=500;
CHANNEL cin5 from port_in 5 to mux_8 6 channelWidth=500;
CHANNEL cin6 from port_in 6 to mux_8 7 channelWidth=500;
CHANNEL cin7 from port_in 7 to mux_8 8 channelWidth=500;
CHANNEL cin8 from port_in 8 to mux_8 9 channelWidth=500;

END LAYER
LAYER CONTROL

PORT cp1, cp2, cp3, cp4, cp5, cp6 portRadius=1000;

CHANNEL cc1 from cp1 4 to mux_8 10 channelWidth=100;
CHANNEL cc2 from cp2 2 to mux_8 11 channelWidth=100;
CHANNEL cc3 from cp3 4 to mux_8 12 channelWidth=100;
CHANNEL cc4 from cp4 2 to mux_8 13 channelWidth=100;
CHANNEL cc5 from cp5 4 to mux_8 14 channelWidth=100;
CHANNEL cc6 from cp6 2 to mux_8 15 channelWidth=100;

END LAYER

