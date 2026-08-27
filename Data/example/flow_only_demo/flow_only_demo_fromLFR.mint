// Compiler output from flow_only_demo.lfr (`fluigi synthesize`).
// Same netlist and default sizes as the handwritten flow_only_demo.mint
// (portRadius=1000, channelWidth=800).

DEVICE flow_only_demo



LAYER FLOW 

MIXER mixer_1 componentSpacing=1000.0 channelWidth=800.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0 mirrorByX=0.0 mirrorByY=0.0 ;
PORT port_1 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_2 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_3 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;



CHANNEL channel_1 from mixer_1 2 to port_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;
CHANNEL channel_2 from port_2 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;
CHANNEL channel_3 from port_3 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;

 

END LAYER
