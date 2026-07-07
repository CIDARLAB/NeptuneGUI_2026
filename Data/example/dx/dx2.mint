DEVICE dx2



LAYER FLOW 

MIXER mixer_1 componentSpacing=9000 ;
DROPLET SORTER droplet_sorter_1 componentSpacing=9000 ;
PORT port_1 componentSpacing=9000 ;
PORT port_2 componentSpacing=9000 ;
PORT port_3 portRadius=2000 componentSpacing=9000 ;
PORT port_4 portRadius=2000 componentSpacing=9000 ;
NOZZLE DROPLET GENERATOR nozzle_droplet_generator_1 componentSpacing=9000 ;
MIXER mixer_2 componentSpacing=9000 ;
PORT port_5 portRadius=2000 componentSpacing=9000 ;
PORT port_6 portRadius=2000 componentSpacing=9000 ;
NOZZLE DROPLET GENERATOR nozzle_droplet_generator_2 componentSpacing=9000 ;
PORT port_7 componentSpacing=9000 ;
PORT port_8 componentSpacing=9000 ;



CHANNEL channel_1 from port_3 1 to nozzle_droplet_generator_1 2 channelWidth=400 connectionSpacing=1000  ;
CHANNEL channel_2 from port_4 1 to nozzle_droplet_generator_1 4 channelWidth=400 connectionSpacing=1000  ;
CHANNEL channel_3 from port_5 1 to nozzle_droplet_generator_2 2 channelWidth=400 connectionSpacing=1000  ;
CHANNEL channel_4 from port_6 1 to nozzle_droplet_generator_2 4 channelWidth=400 connectionSpacing=1000  ;
CHANNEL channel_5 from mixer_1 2 to droplet_sorter_1 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_6 from nozzle_droplet_generator_1 3 to mixer_2 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_7 from nozzle_droplet_generator_2 3 to mixer_2 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_8 from droplet_sorter_1 3 to port_1 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_9 from droplet_sorter_1 3 to port_2 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_10 from mixer_2 2 to mixer_1 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_11 from port_7 1 to nozzle_droplet_generator_2 1 connectionSpacing=1000 channelWidth=400  ;
CHANNEL channel_12 from port_8 1 to nozzle_droplet_generator_1 1 connectionSpacing=1000 channelWidth=400  ;

 

END LAYER

