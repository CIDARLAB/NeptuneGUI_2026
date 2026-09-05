DEVICE valve3D

LAYER FLOW
PORT Port_1 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT Port_2 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
CHANNEL CHANNEL_1 from Port_1 1 to Port_2 1 connectionSpacing=1600 channelWidth=600 crossSection=0 height=250 ;
END LAYER

LAYER CONTROL
PORT Port_3 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
PORT Port_5 componentSpacing=1000.0 portRadius=1000.0 height=1100.0 ;
VALVE3D Valve3D_control_3 on CHANNEL_1 componentSpacing=1000 valveRadius=1200 gap=600 width=2400 length=2400 height=250 rotation=0.0 ;
VALVE3D Valve3D_control_1 on CHANNEL_1 componentSpacing=1000 valveRadius=1200 gap=600 width=2400 length=2400 height=250 rotation=0.0 ;
CHANNEL CHANNEL_2 from Port_3 1 to Valve3D_control_3 1 connectionSpacing=1600 channelWidth=600 crossSection=0 height=250 ;
CHANNEL CHANNEL_3 from Port_5 1 to Valve3D_control_1 1 connectionSpacing=1600 channelWidth=600 crossSection=1 height=250 ;
END LAYER
