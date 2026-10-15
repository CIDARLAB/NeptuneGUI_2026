DEVICE valve3D

LAYER FLOW
PORT Port_1 componentSpacing=2000.0 portRadius=1000.0 depth=1100.0 ;
PORT Port_2 componentSpacing=2000.0 portRadius=1000.0 depth=1100.0 ;
CHANNEL CHANNEL_1 from Port_1 1 to Port_2 1 connectionSpacing=1600 channelWidth=600 RoundedChannel=0 depth=250 ;
END LAYER

LAYER CONTROL
PORT Port_3 componentSpacing=2000.0 portRadius=1000.0 depth=1100.0 ;
VALVE3D Valve3D_1 on CHANNEL_1 componentSpacing=2000 valveRadius=1200 gap=600 depth=250 rotation=180 ;
CHANNEL CHANNEL_2 from Port_3 1 to Valve3D_1 1 connectionSpacing=1600 channelWidth=600 RoundedChannel=0 depth=250 ;
END LAYER
