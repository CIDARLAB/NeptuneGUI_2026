// Handwritten MINT for the same device as flow_and_control_demo.lfr.
// Compare this file with flow_and_control_demo_fromLFR.mint (compiler output).
//
// Why this example exists
// -----------------------
// LFR describes connectivity. MINT is where you set 3DuF geometry.
// Compile this .mint (fluigi synthesizeFromMINT) and open *_fromMINT_PR.json
// in 3DuF: the values below are what you see on the canvas.
//
// Only PORT radius and CHANNEL width differ from the LFR / 3DuF library defaults.
// Mixer and VALVE3D keep those defaults (channelWidth and gap are both 600).
// Try changing one number at a time:
//
//   PORT portRadius     LFR default 1000 → 700 here
//                       Smaller circle at each I/O in 3DuF.
//   CHANNEL channelWidth LFR default 600 (FLOW and CONTROL, same as VALVE3D gap)
//                       → 400 here. Thinner pipes in 3DuF.
//   MIXER channelWidth   keep 600 (library / primitives default).
//   VALVE3D valveRadius  keep 1200. gap/width/length stay 600 / 2400 / 2400.

DEVICE flow_and_control_demo

LAYER FLOW

MIXER mixer_1 componentSpacing=1000.0 channelWidth=600.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0 mirrorByX=0.0 mirrorByY=0.0 ;
PORT port_1 componentSpacing=1000.0 portRadius=700.0 height=1100.0 ;
PORT port_2 componentSpacing=1000.0 portRadius=700.0 height=1100.0 ;
PORT port_3 componentSpacing=1000.0 portRadius=700.0 height=1100.0 ;
PORT port_4 componentSpacing=1000.0 portRadius=700.0 height=1100.0 ;

CHANNEL channel_1 from mixer_1 2 to port_1 1 crossSection=1 connectionSpacing=1000 channelWidth=400 ;
CHANNEL channel_2 from port_2 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=400 ;
CHANNEL channel_3 from port_3 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=400 ;
CHANNEL channel_4 from port_4 1 to port_1 1 crossSection=1 connectionSpacing=1000 channelWidth=400 ;

END LAYER

LAYER CONTROL

PORT Cport_0 componentSpacing=1000.0 portRadius=700.0 height=1100.0 ;
PORT Cport_1 componentSpacing=1000.0 portRadius=700.0 height=1100.0 ;

VALVE3D valve_0 on channel_1 componentSpacing=1000 valveRadius=1200 gap=600 width=2400 length=2400 height=250 rotation=0.0 ;
VALVE3D valve_1 on channel_4 componentSpacing=1000 valveRadius=1200 gap=600 width=2400 length=2400 height=250 rotation=0.0 ;

CHANNEL Ctrlchannel_0 from Cport_0 1 to valve_0 1 crossSection=1 connectionSpacing=1000 channelWidth=400 ;
CHANNEL Ctrlchannel_1 from Cport_1 1 to valve_1 1 crossSection=1 connectionSpacing=1000 channelWidth=400 ;

END LAYER
