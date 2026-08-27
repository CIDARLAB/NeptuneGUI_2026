// Compiler output from flow_and_control_demo.lfr (`fluigi synthesize`).
// Default geometry: portRadius=1000, FLOW channelWidth=800, CONTROL
// channelWidth=600 (same as VALVE3D gap), valveRadius=1200.
// The handwritten flow_and_control_demo.mint keeps the same netlist and valve
// size, but uses smaller ports (700) and thinner channels (400) so you can
// see how MINT parameters change the 3DuF drawing.

DEVICE flow_and_control_demo





// === PORT COUNT CORRECTION ===
// Physical port counts in this file are authoritative for the synthesized device.
// FLOW ports: 4 (LFR module IO declared 4)
// CONTROL ports (Cport_*): 2 (LFR control bit width declared 1)
// VALVE/VALVE3D count: 2
// Port counts differ from the original LFR IO / control bit-width.
// The physical counts above are authoritative. Common causes include
// MUX/distribute one-hot valves, metering nozzles, droplet sorters, and other mapped primitives:
//   - CONTROL expansion via distribute/MUX/transposer/if-else (LFR control bits 1 → physical Cports 2, valves 2)
// === END PORT COUNT CORRECTION ===

LAYER FLOW 

MIXER mixer_1 componentSpacing=1000.0 channelWidth=800.0 bendSpacing=1230.0 numberOfBends=1.0 rotation=0.0 bendLength=2460.0 height=250.0 mirrorByX=0.0 mirrorByY=0.0 ;
PORT port_1 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_2 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_3 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT port_4 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;



CHANNEL channel_1 from mixer_1 2 to port_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;
CHANNEL channel_2 from port_2 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;
CHANNEL channel_3 from port_3 1 to mixer_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;
CHANNEL channel_4 from port_4 1 to port_1 1 crossSection=1 connectionSpacing=1000 channelWidth=800  ;

 

END LAYER

LAYER CONTROL 

PORT Cport_0 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT Cport_1 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;

VALVE3D valve_0 on channel_1 componentSpacing=1000 valveRadius=1200 gap=600 width=2400 length=2400 height=250 rotation=0.0 ;
VALVE3D valve_1 on channel_4 componentSpacing=1000 valveRadius=1200 gap=600 width=2400 length=2400 height=250 rotation=0.0 ;

CHANNEL Ctrlchannel_0 from Cport_0 1 to valve_0 1 crossSection=1 channelWidth=600 connectionSpacing=1000  ;
CHANNEL Ctrlchannel_1 from Cport_1 1 to valve_1 1 crossSection=1 channelWidth=600 connectionSpacing=1000  ;

 

END LAYER
