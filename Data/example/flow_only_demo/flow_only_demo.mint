// Handwritten MINT for the same device as flow_only_demo.lfr.
// Compare with flow_only_demo_fromLFR.mint (compiler output). The sizes here
// match the LFR / 3DuF library defaults (portRadius=1000, channelWidth=600).
// Change PORT portRadius or CHANNEL channelWidth, compile this file, and open
// the PR JSON in 3DuF to see the geometry change.

DEVICE flow_only_demo

LAYER FLOW

MIXER mixer_1 componentSpacing=1000.0 channelWidth=600.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0 mirrorByX=0.0 mirrorByY=0.0 ;
PORT port_1 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_2 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_3 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;

CHANNEL channel_1 from mixer_1 2 to port_1 1 crossSection=1 connectionSpacing=1000 channelWidth=600 ;
CHANNEL channel_2 from port_2 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=600 ;
CHANNEL channel_3 from port_3 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=600 ;

END LAYER
