-- TYPES
-- Add types of stargates leading to Zarzakh
INSERT INTO type VALUES (77918, '2023-11-11 16:37:40', '2023-11-11 16:37:40', "Stargate (Jovian Turnur)", "This ancient Jovian stargate was recently rediscovered after aeons hidden in an obscure corner of the Turnur star system. \r\n\r\nThis stargate is evidently under the control of the Deathless Circle organization of pirates and smugglers.", 0, 34000, 10000000, 0, 100000000000, 10, 0, 10000000, 1, 26212);
INSERT INTO type VALUES (78264, '2023-11-11 16:37:40', '2023-11-11 16:37:40', "Stargate (Jovian Alsavoinon)", "This ancient Jovian stargate was recently rediscovered after aeons hidden in an obscure corner of the Alsavoinon star system. \r\n\r\nThis stargate is evidently under the control of the Deathless Circle organization of pirates and smugglers.", 0, 34000, 10000000, 0, 100000000000, 10, 0, 10000000, 1, 26213);
INSERT INTO type VALUES (78265, '2023-11-11 16:37:40', '2023-11-11 16:37:40', "Stargate (Jovian H-PA29)", "This ancient Jovian stargate was recently rediscovered after aeons hidden in an obscure corner of the H-PA29 star system. \r\n\r\nThis stargate is evidently under the control of the Deathless Circle organization of pirates and smugglers.", 0, 34000, 10000000, 0, 100000000000, 10, 0, 10000000, 1, 26214);
INSERT INTO type VALUES (78266, '2023-11-11 16:37:40', '2023-11-11 16:37:40', "Stargate (Jovian G-0Q86)", "This ancient Jovian stargate was recently rediscovered after aeons hidden in an obscure corner of the G-0Q86 star system. \r\n\r\nThis stargate is evidently under the control of the Deathless Circle organization of pirates and smugglers.", 0, 34000, 10000000, 0, 100000000000, 10, 0, 10000000, 1, 26215);

-- Add type of outbound stargates in Zarzakh
INSERT INTO type VALUES (77921, '2023-11-11 16:37:40', '2023-11-11 16:37:40', "Stargate (Jovian Zarzakh)", "This ancient Jovian stargate is one of several that are found in the strange and hazardous Zarzakh system. \r\n\r\nThe stargates in Zarzakh connect it to systems far across New Eden and indicate this was a key outpost in an ancient Jovian transport network.", 0, 34000, 10000000, 0, 100000000000, 10, 0, 10000000, 1, 26197);

-- Add Zarzakh sun type
INSERT INTO type VALUES (78350, '2023-11-11 16:37:40', '2023-11-11 16:37:40', "Sun A0 (Captured Blue Small)", "This small blue star of the unusual A0 classification has been gravitationally captured by a black hole, and is slowly orbiting closer and closer to its eventual merger with the mass singularity. This event will take place many years in the future but the effects of orbiting in the vicinity of a black hole are already being felt in the form of intense and volatile gravitational tidal forces exerted by the singularity. As the star is within the outer edges of the matter accretion disc of the black hole, the instability is further contributed to by the fluctuations in mass density within the clouds of dust, gas, and other matter. The local system environment here is harsh and unforgiving to say the least.", 0, 10000, 1, 0, 1000000000000000000, 6, 0, 1, 1, 26261);

-- Add Zarzakh star itself
INSERT INTO star VALUES (40488503, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Zarzakh - Star', 78350, 4534565487, 325800000, 6347, 0.9409999847412109, "F7 V");


-- MAP
-- Add Region
INSERT INTO region VALUES (10001000, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Yasna Zakh', `Centuries ago a major void between the stars of the New Eden cluster was discovered by Amarr explorers pursuing the cause of their Empire's expansion through the cluster. This void was named \"Yasna Zakh\", meaning \"Edge of Devotion\", to express the idea that this was created by God as a limit on the reach of the Amarr's own drive to \"reclaim\" the stars. Over time, the meaning shifted and this gap is usually known as \"Divinity's Edge\" in common parlance. <br><br>For many years the Yasna Zakh void was thought to mark the edge of the cluster but was eventually recognised as a major feature of the internal structure of New Eden, effectively bisecting the cluster almost in half. The major passage through the Providence and Catch regions to the eastern cluster is conventionally credited to later Amarr explorers but a number of the routes, and in particular the narrow bridge between Molden Heath and the Great Wildlands are thought to be the discoveries of Thukker Tribe nomads and other Minmatar. <br><br>Latterly, the rediscovery of the star system Zarzakh orbiting close by the small black hole known as \"Point of No Return\" has renewed interest in this desolate region of space. The Amarr name for the black hole is \"Duzna Kah\", meaning \"Fallen Beyond Hope\", and this terminology appears to be used by the controlling Deathless Circle. Given the notable antipathy of the Deathless to the Amarr and their religion, this may be a mockingly ironic choice on the part of the enigmatic leader of the Circle.`);

-- Add Constellation
INSERT INTO constellation VALUES (20010000, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Duzna Kah', 10001000, 5732782451210000, 3722598544370000, -508346782640000);

-- Add Zarzakh system
INSERT INTO system VALUES (30100000, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Zarzakh', 20010000, 40488503, 'T', -1.0, -1.0, 'C', null, 4732782451200000, 2722598544370000, -1508346782640000);


-- NEIGHBOURS
-- Update Zarzakh's neighbours jumpNodes
UPDATE system_neighbour SET jumpNodes='30002083:30002084:30002087:30100000' WHERE id=3058;
UPDATE system_neighbour SET jumpNodes='30003836:30004046:30100000' WHERE id=3647;
UPDATE system_neighbour SET jumpNodes='30001268:30001270:30001273:30100000' WHERE id=1166;
UPDATE system_neighbour SET jumpNodes='30001020:30001036:30001038:30001039:30100000' WHERE id=938;

-- Add Zarzakh neighbour
INSERT INTO system_neighbour VALUES (default, 10001000, 20010000, 30100000, 'Zarzakh', '30002086:30003841:30001269:30001041', -1.0);


-- STARGATES
-- Four gates leading TO Zarzakh
INSERT INTO stargate VALUES (50016562, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (Zarzakh)', 30002086, 77918, 30100000, -179377314531, 560763152392, 634445033895);
INSERT INTO stargate VALUES (50016563, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (Zarzakh)', 30003841, 78264, 30100000, 1047151351280, -790735827641, 615636680325);
INSERT INTO stargate VALUES (50016564, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (Zarzakh)', 30001269, 78265, 30100000, -655667795216, 529365986709, -916401049223);
INSERT INTO stargate VALUES (50016565, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (Zarzakh)', 30001041, 78266, 30100000, -808530790691, -652546109720, -334838044473);

-- Four gates leading OUT of Zarzakh
INSERT INTO stargate VALUES (50016566, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (Turnur)', 30100000, 77921, 30002086, 731080892183, 1000000000000, 266091580259);
INSERT INTO stargate VALUES (50016567, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (Alsavoinon)', 30100000, 77921, 30003841, -595982139822, 1000000000000, 500089281042);
INSERT INTO stargate VALUES (50016568, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (H-PA29)', 30100000, 77921, 30001269, -500088946303, 1000000000000, -595982420702);
INSERT INTO stargate VALUES (50016569, '2023-11-11 16:37:40', '2023-11-11 16:37:40', 'Stargate (G-0Q86)', 30100000, 77921, 30001041, 500088276823, 1000000000000, -595982982462);
