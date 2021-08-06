-- Add the new Pochven region
INSERT INTO `region` VALUES
(10000070,'2020-10-23 00:00:00','2020-10-23 00:00:00','Pochven','');

-- Add the new Pochven constellations
INSERT INTO `constellation` VALUES
(20000787, '2019-01-01 07:10:54', '2019-01-01 07:10:54', 'Perun', 10000070, -1.62832101952226e17, 5.06566811280612e16, 1.03886924951039e17),
(20000788, '2019-01-01 07:10:54', '2019-01-01 07:10:54', 'Svarog', 10000070, -1.09497929445299e17, 4.56773536796065e16, 2.0441554643762e16),
(20000789, '2019-01-01 07:10:54', '2019-01-01 07:10:54', 'Veles', 10000070, -1.6393375393592e17, 5.63776884101948e16, 7.13269711209869e16);

-- Add new race definitions
INSERT INTO `race` (`id`, `created`, `updated`, `name`, `description`, `factionId`) VALUES
(134, '2020-10-29 20:44:32', '2020-10-29 20:44:32', 'Rogue Drones', 'Rogue Drones', 500026),
(135, '2020-10-29 20:44:32', '2020-10-29 20:44:32', 'Triglavian', 'Triglavian', 500026);

-- Add new corporation definitions
INSERT INTO `corporation` (`id`, `created`, `updated`, `name`, `ticker`, `dateFounded`, `memberCount`, `isNPC`, `factionId`, `allianceId`) VALUES
(1000292, '2020-10-29 20:44:32', '2020-10-29 20:44:32', 'Veles Clade', 'CLVEL', NULL, 1, 1, NULL, NULL),
(1000293, '2020-10-29 20:44:32', '2020-10-29 20:44:32', 'Perun Clade', 'CLPER', NULL, 1, 1, NULL, NULL),
(1000294, '2020-10-29 20:44:32', '2020-10-29 20:44:32', 'Svarog Clade', 'CLSVA', NULL, 1, 1, NULL, NULL),
(1000298, '2020-10-29 20:44:32', '2020-10-29 20:44:32', 'The Convocation of Triglav', 'CTPSV', NULL, 1, 1, NULL, NULL);

-- Add the new faction defintions
INSERT INTO `faction` (`id`, `created`, `updated`, `name`, `description`, `sizeFactor`, `stationCount`, `stationSystemCount`) VALUES
(500024, '2019-01-01 07:58:30', '2019-01-01 07:58:30', 'Drifters', 'Emerging from the ruins of the Sleeper civilization spread throughout Anoikis – otherwise known as \'W-space\' – the Drifters represent a tremendous challenge and perhaps a dire threat to the empires and capsuleers alike. Seemingly the inheritors of a legacy left behind by some of the most ancient Jove, the Drifters are unafraid to wield tremendous power in response to any who get in their way. In this regard, the Drifters are a very different conundrum than the relatively benign presence that was the Jove Empire.', 0, 0, 0),
(500025, '2019-01-01 07:58:30', '2019-01-01 07:58:30', 'Rogue Drones', 'While rogues drones come in all shapes, sizes and even personalities, the signs are that they do not exist in a unified collective. Much like their accidental creators, the rogue drones can be found co-operating locally, and even in relatively large and widespread \'hive minds\', but they will readily attack and recycle drones from competing hives.', 0, 0, 0),
(500026, '2019-01-01 07:58:30', '2019-01-01 07:58:30', 'Triglavian Collective', 'The Triglavian Collective appears to be a human civilization that secluded itself in the depths of Abyssal Deadspace centuries, perhaps millennia ago. The Triglavian civilization has demonstrable expertise in advanced space-time mechanics, coupled with a mastery of bioadaptive technology that it uses to survive the shifting environments of the Abyss.', 0, 0, 0),
(500027, '2019-01-01 07:58:30', '2019-01-01 07:58:30', 'EDENCOM', 'EDENCOM is the New Eden Common Defense Initiative, a semi-autonomous military command set up by CONCORD and the \"Big 4\" core empires to aggressively prosecute the war against the Triglavian Collective\'s invasion forces in YC122. With access to massive financial resources from the New Eden Defense Fund, EDENCOM organizes the fortification of threatened systems and the defense of New Eden by fleets and troops drawn from CONCORD and the empires.', 5, 0, 0);

-- Delete and re-add the Pochven systems with the appropriate security and marked as T class
DELETE FROM `system` WHERE id in (30000157,30000192,30001372,30001445,30002079,30002737,30005005,30010141,30031392,30000021,30001413,30002225,30002411,30002770,30003495,30003504,30040141,30045328,30000206,30001381,30002652,30002702,30002797,30003046,30005029,30020141,30045329);
INSERT INTO `system` VALUES
(30000021, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Kuharah', 20000788, 40001414, 'T', -1.0, -1.000000, 'B3', NULL, -7.43798108537478e16, 3.25389695310869e16, -1.00531188490154e17),
(30000157, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Otela', 20000787, 40009947, 'T', -1.0, -1.000000, 'C', NULL, -8.96204009939061e16, 7.50489043121383e16, 9.35019741389732e16),
(30000192, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Otanuomi', 20000787, 40012114, 'T', -1.0, -1.000000, 'C1', NULL, -8.73732576844063e16, 7.5689721980109e16, 1.42703848208881e17),
(30000206, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Wirashoda', 20000789, 40013086, 'T', -1.0, -1.000000, 'C', NULL, -1.06151172886939e17, 7.83563820339954e16, 1.41377176585695e17),
(30001372, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Kino', 20000787, 40087443, 'T', -1.0, -1.000000, 'C', NULL, -1.60915471526408e17, 6.7043767919059e16, 1.25107505898049e17),
(30001381, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Arvasaras', 20000789, 40088050, 'T', -1.0, -1.000000, 'C', NULL, -1.48590517644254e17, 6.94615716936862e16, 1.52406151534013e17),
(30001413, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Nani', 20000788, 40089958, 'T', -1.0, -1.000000, 'B', NULL, -1.48065696202304e17, 7.77917922204687e16, 1.29656645031242e17),
(30001445, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Nalvula', 20000787, 40091964, 'T', -1.0, -1.000000, 'C1', NULL, -1.46377524733192e17, 9.13379356036351e16, 1.64368663896425e17),
(30002079, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Krirald', 20000787, 40132732, 'T', -1.0, -1.000000, 'E1', NULL, -1.43041070520313e17, 2.01540335132781e15, 4.34051860056528e16),
(30002225, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Harva', 20000788, 40141854, 'T', -1.0, -1.000000, 'B', NULL, -1.64523098443557e17, 7.11904961706963e16, -9.87386236225013e16),
(30002411, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Skarkon', 20000788, 40153348, 'T', -1.0, -1.000000, 'E1', NULL, -6.53278245121052e15, -4.52259854437016e15, 8.86713130833136e15),
(30002652, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Ala', 20000789, 40168849, 'T', -1.0, -1.000000, 'D1', NULL, -1.74797042068211e17, 3.57240817881842e16, -9.7522092920391e15),
(30002702, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Archee', 20000789, 40171916, 'T', -1.0, -1.000000, 'D2', NULL, -1.76317610266812e17, 5.66557757073429e16, -1.00117920020392e15),
(30002737, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Konola', 20000787, 40173750, 'T', -1.0, -1.000000, 'C', NULL, -1.31635661363785e17, 9.92979589047945e16, 1.4699167278862e17),
(30002770, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Tunudan', 20000788, 40175854, 'T', -1.0, -1.000000, 'C1', NULL, -1.74269057189913e17, 7.78799008426401e16, 9.08094631370572e16),
(30002797, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Kaunokka', 20000789, 40177483, 'T', -1.0, -1.000000, 'C', NULL, -1.75536874183723e17, 8.08258734880394e16, 1.05495547031891e17),
(30003046, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Angymonne', 20000789, 40193536, 'T', -1.0, -1.000000, 'D1', NULL, -2.13411461260432e17, 1.47965253096225e16, 2.4458159382976e16),
(30003495, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Raravoss', 20000788, 40221765, 'T', -1.0, -1.000000, 'B1', NULL, -1.70692078821188e17, 4.83773767209905e16, -7.42121487288746e16),
(30003504, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Niarja', 20000788, 40222373, 'T', -1.0, -1.000000, 'B1', NULL, -1.84441638429595e17, 4.93524100744771e16, -2.47548529253837e16),
(30005005, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Ignebaener', 20000787, 40317021, 'T', -1.0, -1.000000, 'D1', NULL, -2.38290946220046e17, 5.55893507074342e16, 4.38587565621402e16),
(30005029, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Vale', 20000789, 40318635, 'T', -1.0, -1.000000, 'D1', NULL, -2.21716334984902e17, 3.93332802399994e16, 4.93277604430606e16),
(30010141, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Sakenta', 20000787, 40342201, 'T', -1.0, -1.000000, 'A', NULL, -1.40996816819161e17, 6.3157462493689e16, 1.13295800169879e17),
(30020141, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Senda', 20000789, 40342401, 'T', -1.0, -1.000000, 'A', NULL, -1.25231920215349e17, 7.19353118887792e16, 9.25731715345483e16),
(30031392, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Komo', 20000787, 40341801, 'T', -1.0, -1.000000, 'A', NULL, -1.32977161365216e17, 9.87062324799372e16, 1.30925577274748e17),
(30040141, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Urhinichi', 20000788, 40342801, 'T', -1.0, -1.000000, 'A', NULL, -1.38550934148756e17, 7.80775920633859e16, 8.31939874802183e16),
(30045328, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Ahtila', 20000788, 40348813, 'T', -1.0, -1.000000, NULL, NULL, -2.12463076439387e17, 9.58773059035831e16, 1.41414297777678e17),
(30045329, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Ichoriya', 20000789, 40348840, 'T', -1.0, -1.000000, NULL, NULL, -2.19761023509134e17, 9.7958851510767e16, 1.41316657360649e17);

-- Delete the stargates that go to/from Pochven systems
DELETE FROM `stargate` WHERE id in (50000299,50000323,50000425,50001061,50001093,50001094,50001724,50001725,50001982,50002223,50002428,50002435,50002679,50002715,50002743,50002744,50002768,50002775,50003007,50003008,50003355,50003738,50004068,50004069,50004148,50004326,50004353,50004604,50004605,50004606,50004787,50005024,50005218,50005383,50005688,50006005,50006006,50006082,50006242,50006780,50006781,50006782,50006783,50006784,50006785,50006997,50007219,50007720,50007831,50007832,50007835,50008033,50008034,50008597,50008733,50008734,50008735,50008736,50009271,50009281,50009282,50009283,50009284,50009285,50009381,50009417,50009447,50009648,50009666,50009690,50009691,50009692,50009735,50009746,50009747,50009748,50009749,50009895,50010118,50010471,50010576,50010655,50010691,50010719,50010721,50010757,50010822,50010823,50010850,50011096,50011326,50011907,50012045,50012690,50012785,50013091,50013401,50013472,50013693,50013694,50013695,50013696,50013709,50013710,50014055,50014056,50014065,50014066,50014107,50014108,50014109,50014110,50014113,50014114,50014213,50014214,50014287,50014288,50016295,50016296,50016299,50016300,50016301,50016302,50016307,50016308,50016317,50016318,50016480,50016481);

-- Add the new conduit stargate type and new wormholes
INSERT INTO `type` VALUES
(56317, '2020-10-23 00:00:00', '2020-10-23 00:00:00', 'Pochven Conduit Gate (Interstellar)','This Triglavian structure is designed to function as a permanent transfer conduit between star systems in the constructed Triglavian region of Pochven. Triglavian Space is made up of systems \"woven\" together by the Triglavians into an artificial arrangement defined by the Pochven Conduit Loop.\r\n\r\nAccess to Pochven Conduit Gates is determined by the level of standing a capsuleer has with the Triglavian Collective and requirements may vary depending on the type of system into which the Conduit Gate leads.\r\n\r\nAs with most Triglavian technology, the power for this device is drawn from harnessed space-time singularities. As the conduit clearly uses an array of three such singularities, the energy requirements must be considerable.',0,30000000,30000000,0,300000000000,10,0,30000000,1,24656),
(56535, '2021-06-15 09:23:23', '2021-06-15 09:23:23', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56536, '2021-06-15 09:23:24', '2021-06-15 09:23:24', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56537, '2021-06-15 09:23:24', '2021-06-15 09:23:24', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56538, '2021-06-15 09:23:24', '2021-06-15 09:23:24', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56539, '2021-06-15 09:23:24', '2021-06-15 09:23:24', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56540, '2021-06-15 09:23:24', '2021-06-15 09:23:24', 'Wormhole X450', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56541, '2021-06-15 09:23:24', '2021-06-15 09:23:24', 'Wormhole R081', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56542, '2021-06-15 09:23:25', '2021-06-15 09:23:25', 'Wormhole F216', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56544, '2021-06-15 09:23:25', '2021-06-15 09:23:25', 'Wormhole U372', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56545, '2021-06-15 09:23:25', '2021-06-15 09:23:25', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56546, '2021-06-15 09:23:25', '2021-06-15 09:23:25', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56547, '2021-06-15 09:23:25', '2021-06-15 09:23:25', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56548, '2021-06-15 09:23:26', '2021-06-15 09:23:26', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56549, '2021-06-15 09:23:26', '2021-06-15 09:23:26', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56550, '2021-06-15 09:23:26', '2021-06-15 09:23:26', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56551, '2021-06-15 09:23:26', '2021-06-15 09:23:26', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56552, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56553, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56554, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56555, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56556, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56557, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56558, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56559, '2021-06-15 09:23:27', '2021-06-15 09:23:27', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56560, '2021-06-15 09:23:28', '2021-06-15 09:23:28', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56561, '2021-06-15 09:23:28', '2021-06-15 09:23:28', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56562, '2021-06-15 09:23:28', '2021-06-15 09:23:28', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56563, '2021-06-15 09:23:29', '2021-06-15 09:23:29', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56564, '2021-06-15 09:23:29', '2021-06-15 09:23:29', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715),
(56565, '2021-06-15 09:23:29', '2021-06-15 09:23:29', 'Wormhole C729', 'An unstable wormhole, deep in space. Wormholes of this kind usually collapse after a few days, and can lead to anywhere.', 0, 3000, 0, 0, 0,988,0, 0, 1, 3715);

-- Add the new inter-Pochven conduit gates
INSERT INTO `stargate` VALUES
(50016504,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Tunudan)',30000021,56317,30002770,-120679911185.506,-8208806312.39407,-25334939508.729),
(50016506,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ahtila)',30000021,56317,30045328,25691798724.6383,1743913858.25688,80759612685.887),
(50016518,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Nalvula)',30000157,56317,30001445,-182160561690.696,2147946726.54473,-345063156566.141),
(50016520,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Kino)',30000157,56317,30001372,-116619685499.206,1375696452.77168,-143656149644.895),
(50016522,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ignebaener)',30000157,56317,30005005,27653905828.6961,-329241484.091217,66844787079.4121),
(50016508,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Urhinichi)',30000192,56317,30040141,6820391198620.59,-389751258291.819,5884231218155.93),
(50016510,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Krirald)',30000192,56317,30002079,-3044484958639.29,173981469885.497,4202630042781.55),
(50016544,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ala)',30000206,56317,30002652,-33672589988.1116,-1533718190.00042,-26608090792.4362),
(50016546,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Senda)',30000206,56317,30020141,-16854838872.1837,-766560179.830146,59946195185.977),
(50016516,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Nalvula)',30001372,56317,30001445,-1575690690.04211,-277788063.164062,369657.859375),
(50016521,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Otela)',30001372,56317,30000157,-1575476341.75,-277788063.164062,-196.234375),
(50016528,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Sakenta)',30001381,56317,30010141,4516286796131.96,670047115198.452,3899990178457.06),
(50016530,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Kaunokka)',30001381,56317,30002797,9346525957127.52,1386674550944.06,1280158440751.28),
(50016490,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Urhinichi)',30001413,56317,30040141,-33466588035.1279,-2784570816.51998,139994192231.402),
(50016492,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Skarkon)',30001413,56317,30002411,-43321874545.7229,-3604957524.82498,-52558691494.6837),
(50016514,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Konola)',30001445,56317,30002737,-94919231848.2139,16864276672.5781,57287761803.3464),
(50016517,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Kino)',30001445,56317,30001372,-53136924928.9125,9439744704.01592,-39638187061.8547),
(50016519,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Otela)',30001445,56317,30000157,-76565414316.8666,13605709698.2886,-24541501945.2162),
(50016511,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Otanuomi)',30002079,56317,30000192,-176704360415.732,24551587486.3602,-93492840620.5753),
(50016512,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Konola)',30002079,56317,30002737,-60749125000.0958,8441650939.51877,120745184262.197),
(50016498,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Raravoss)',30002225,56317,30003495,-26260383006.7908,401617524.202589,180927621370.995),
(50016500,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Niarja)',30002225,56317,30003504,16339293779.3904,-240713683.824381,63250691291.8122),
(50016502,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Tunudan)',30002225,56317,30002770,-141062946871.881,2105242658.61574,-11487878149.8396),
(50016493,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Nani)',30002411,56317,30001413,-203618631474.854,20731842127.1706,38153612375.4572),
(50016494,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Raravoss)',30002411,56317,30003495,-36550452379.0828,3720159891.6616,61460227034.4734),
(50016542,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Vale)',30002652,56317,30005029,-59872672486.0203,-6635868803.04173,101426736288.875),
(50016545,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Wirashoda)',30002652,56317,30000206,-76931482832.0417,-8525380113.65115,-30306320212.8666),
(50016536,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Angymonne)',30002702,56317,30003046,-1575903855.20312,-277788063.164062,-450.1796875),
(50016540,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Vale)',30002702,56317,30005029,-1575690690.04211,-277788063.164062,369657.859375),
(50016513,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Krirald)',30002737,56317,30002079,-40637382361.732,-5895504123.72433,-41339032547.7954),
(50016515,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Nalvula)',30002737,56317,30001445,4136345323.5571,598953591.751613,85039497674.8882),
(50016503,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Harva)',30002770,56317,30002225,30508537221.09,-1040888257.29128,55237019840.1697),
(50016505,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Kuharah)',30002770,56317,30000021,-9953063416.41721,339330066.877542,-39595238037.1909),
(50016531,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Arvasaras)',30002797,56317,30001381,-165045107009.291,-870434399.819752,-30766386245.8283),
(50016532,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ichoriya)',30002797,56317,30045329,-33965837457.8698,-178637573.967913,82285826902.6569),
(50016534,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ichoriya)',30003046,56317,30045329,8485061619.66521,-1340421400.70196,60172399920.7024),
(50016537,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Archee)',30003046,56317,30002702,63308148984.533,-10003541036.8147,65054798224.9222),
(50016538,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Vale)',30003046,56317,30005029,850964740.730912,-135547025.655579,32863998550.9116),
(50016495,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Skarkon)',30003495,56317,30002411,-154357198385.636,7606890531.77306,22636705969.4563),
(50016496,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Niarja)',30003495,56317,30003504,-39159002545.8854,1931847425.34929,69529232122.5561),
(50016499,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Harva)',30003495,56317,30002225,49946546740.3573,-2461793786.54069,-920024320.559785),
(50016497,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Raravoss)',30003504,56317,30003495,-1575903855.20312,-277788063.164062,-450.1796875),
(50016501,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Harva)',30003504,56317,30002225,-1575476341.75,-277788063.164062,-196.234375),
(50016523,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Otela)',30005005,56317,30000157,-10582657098.0218,29408221.421557,-57478693598.1193),
(50016524,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Komo)',30005005,56317,30031392,-41482312205.2112,116441200.041782,116794666999.713),
(50016539,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Angymonne)',30005029,56317,30003046,-251379635258.458,-31958549873.3524,-79769601581.9263),
(50016541,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Archee)',30005029,56317,30002702,40135016792.7012,5100682427.29824,129654503327.149),
(50016543,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ala)',30005029,56317,30002652,135732469216.596,17255378524.4497,-389481313437.952),
(50016526,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Komo)',30010141,56317,30031392,-1791111429143.24,217129059367.688,-1206737798800.76),
(50016529,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Arvasaras)',30010141,56317,30001381,983466364916.661,-119220382336.407,-1157787444111.98),
(50016547,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Wirashoda)',30020141,56317,30000206,954300615427.337,-115686275102.227,-1542132946740.14),
(50016548,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ahtila)',30020141,56317,30045328,-1791101683012.5,217132705106.103,-1206729169168.83),
(50016525,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Ignebaener)',30031392,56317,30005005,-10455519101.9513,494992264.48873,-47120162779.0055),
(50016527,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Sakenta)',30031392,56317,30010141,6431537944.45046,-304856605.879895,-93474655353.6784),
(50016491,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Nani)',30040141,56317,30001413,983454916073.212,-119220941073.23,-1157780287413.32),
(50016549,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Otanuomi)',30040141,56317,30000192,-1791117914427.68,217129609388.474,-1206736097484.83),
(50016507,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Kuharah)',30045328,56317,30000021,179528068824.763,2459763672.65493,2163149020835.11),
(50016509,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Senda)',30045328,56317,30020141,821698610932.84,52547391041.2756,1283241368884.19),
(50016533,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Kaunokka)',30045329,56317,30002797,-57257126211.4551,-4334403.81694235,61549071910.7095),
(50016535,'2020-10-23 00:00:00','2020-10-23 00:00:00','Conduit (Angymonne)',30045329,56317,30003046,-172607772036.825,-11038838930.515,-19179922446.8049);


-- Delete old station definitions for stations that have been reassigned to trig owner
DELETE FROM `station` WHERE systemId IN (30000157,30000192,30001372,30001445,30002079,30002737,30005005,30010141,30031392,30000021,30001413,30002225,30002411,30002770,30003495,30003504,30040141,30045328,30000206,30001381,30002652,30002702,30002797,30003046,30005029,30020141,30045329);

-- Re-add new definitions for trig stations in Pochven
INSERT INTO `station` (`id`, `created`, `updated`, `name`, `systemId`, `typeId`, `corporationId`, `raceId`, `services`, `x`, `y`, `z`) VALUES
(60000355, '2019-09-29 20:44:23', '2019-09-29 20:44:23', 'Kino VII - Moon 13 - Perun Clade Porevitium Vault', 30001372, 1531, 1000293, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 632787148800, 13068410880, 1517070458880),
(60000382, '2019-09-29 20:43:11', '2019-09-29 20:43:11', 'Otanuomi IV - Moon 5 - Perun Clade Bioadaptation Chambers', 30000192, 1531, 1000293, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 333710008320,-19070361600, 403623321600),
(60000391, '2019-09-29 20:43:11', '2019-09-29 20:43:11', 'Otanuomi VI - Moon 9 - The Convocation of Triglav Proving Complex', 30000192, 1531, 1000298, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-2314164510720, 132243578880, 1967015485440),
(60000487, '2019-09-29 20:43:15', '2019-09-29 20:43:15', 'Wirashoda VII - Moon 5 - Veles Clade Mutaplasmid Farm', 30000206, 4023, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-1068753838080,-48692305920,-249647063040),
(60000490, '2019-09-29 20:43:15', '2019-09-29 20:43:15', 'Wirashoda V - Veles Clade Extractive Terminus', 30000206, 4023, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-147563765760,-6727557120,-29413908480),
(60000556, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka IV - Veles Clade Semiosis Theater', 30002797, 4023, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 98016583680, 512286720, 341574819840),
(60000559, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka II - Moon 1 - Veles Clade Mutaplasmid Farm', 30002797, 4023, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-165127987200,-868638720,-30465761280),
(60000583, '2019-09-29 20:43:11', '2019-09-29 20:43:11', 'Otanuomi VI - Moon 7 - Perun Clade Extractive Terminus', 30000192, 4024, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-2313332613120, 132195409920, 1966423695360),
(60000586, '2019-09-29 20:43:11', '2019-09-29 20:43:11', 'Otanuomi V - Moon 16 - Perun Clade Mutaplasmid Farm', 30000192, 4024, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 354312314880,-20247306240,-1144453816320),
(60000628, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka VI - Moon 1 - Veles Clade Extractive Terminus', 30002797, 4023, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-867432407040,-4563640320,-49477754880),
(60000634, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka III - Moon 1 - Veles Clade Extractive Terminus', 30002797, 4023, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 226586664960, 1191813120, 132432568320),
(60000706, '2019-09-29 20:44:23', '2019-09-29 20:44:23', 'Kino V - Moon 3 - Perun Clade Semiosis Theater', 30001372, 4023, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 382086881280, 7890739200,-368404193280),
(60000712, '2019-09-29 20:44:23', '2019-09-29 20:44:23', 'Kino IV - Moon 12 - Perun Clade Extractive Terminus', 30001372, 4023, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 283936235520, 5864693760, 113623326720),
(60000952, '2019-09-29 20:44:23', '2019-09-29 20:44:23', 'Kino VII - Moon 17 - The Convocation of Triglav Bioadaptation Chambers', 30001372, 1531, 1000298, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"fitting\",\"news\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 628407705600, 12978462720, 1516068741120),
(60000961, '2019-09-29 20:44:23', '2019-09-29 20:44:23', 'Kino VII - Moon 10 - Perun Clade Bioadaptation Chambers', 30001372, 1531, 1000293, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"fitting\",\"news\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 632845885440, 13069148160, 1516146892800),
(60000970, '2019-09-29 20:43:15', '2019-09-29 20:43:15', 'Wirashoda VIII - Moon 5 - Veles Clade Bioadaptation Chambers', 30000206, 1531, 1000292, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"fitting\",\"news\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 3083493580800, 140485877760,-402548858880),
(60001471, '2019-09-29 20:57:57', '2019-09-29 20:57:57', 'Tunudan VII - Moon 4 - Svarog Clade Semiosis Theater', 30002770, 1531, 1000294, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 432332021760,-14745231360,-175938969600),
(60001618, '2019-09-29 20:57:57', '2019-09-29 20:57:57', 'Tunudan IX - Svarog Clade Porevitium Vault', 30002770, 1531, 1000294, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 291634913280,-9966428160,-3020527902720),
(60002002, '2019-09-29 20:56:21', '2019-09-29 20:56:21', 'Krirald IX - Moon 1 - Perun Clade Semiosis Theater', 30002079, 1531, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"interbus\",\"reprocessing-plant\",\"market\",\"stock-exchange\",\"gambling\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 5438905344000,-755710402560,-4023534919680),
(60002242, '2019-09-29 20:43:11', '2019-09-29 20:43:11', 'Otanuomi IV - Moon 4 - Perun Clade Proving Complex', 30000192, 1529, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"interbus\",\"reprocessing-plant\",\"refinery\",\"market\",\"black-market\",\"stock-exchange\",\"cloning\",\"surgery\",\"dna-therapy\",\"repair-facilities\",\"factory\",\"labratory\",\"gambling\",\"fitting\",\"paintshop\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 333783736320,-19074048000, 403402874880),
(60002293, '2019-09-29 20:57:47', '2019-09-29 20:57:47', 'Konola V - Moon 12 - Perun Clade Extractive Terminus', 30002737, 1531, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 583322296320, 84648468480, 1286805872640),
(60002434, '2019-09-29 20:43:04', '2019-09-29 20:43:04', 'Otela IV - Moon 9 - Perun Clade Mutaplasmid Farm', 30000157, 1531, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-614042050560, 7271424000, 30287339520),
(60002884, '2019-09-29 20:44:25', '2019-09-29 20:44:25', 'Arvasaras II - Moon 1 - Veles Clade Extractive Terminus', 30001381, 1529, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-71872880640,-10663157760,-184578662400),
(60003034, '2019-09-29 20:43:04', '2019-09-29 20:43:04', 'Otela V - Moon 1 - The Convocation of Triglav Semiosis Theater', 30000157, 1529, 1000298, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 571541790720,-6767861760,-1333535416320),
(60003037, '2019-09-29 20:43:04', '2019-09-29 20:43:04', 'Otela II - Perun Clade Bioadaptation Chambers', 30000157, 1529, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-116607590400, 1376624640,-143716392960),
(60003535, '2019-09-29 20:58:42', '2019-09-29 20:58:42', 'Angymonne V - Moon 6 - Veles Clade Semiosis Theater', 30003046, 1530, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"stock-exchange\",\"cloning\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 394697072640,-62365900800,-71033364480),
(60003847, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka VI - Moon 2 - The Convocation of Triglav Semiosis Theater', 30002797, 1529, 1000298, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-867151011840,-4562411520,-49197588480),
(60003850, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka II - Moon 1 - The Convocation of Triglav Proving Complex', 30002797, 54, 1000298, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"labratory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-165127495680,-868638720,-30462812160),
(60004024, '2019-09-29 20:44:23', '2019-09-29 20:44:23', 'Kino VII - Moon 7 - Perun Clade Semiosis Theater', 30001372, 54, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"labratory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]', 633568665600, 13083893760, 1515456307200),
(60004150, '2019-09-29 20:44:45', '2019-09-29 20:44:45', 'Nalvula IX - Moon 2 - Perun Clade Extractive Terminus', 30001445, 1529, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]', 853629788160,-151672872960, 592291553280),
(60004282, '2019-09-29 20:44:26', '2019-09-29 20:44:26', 'Arvasaras II - Moon 3 - Veles Clade Proving Complex', 30001381, 54, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"labratory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-71773102080,-10647674880,-184791490560),
(60004477, '2019-09-29 20:44:45', '2019-09-29 20:44:45', 'Nalvula IV - Moon 1 - Perun Clade Proving Complex', 30001445, 1529, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-94831779840, 16849428480, 57302999040),
(60004651, '2019-09-29 20:56:59', '2019-09-29 20:56:59', 'Skarkon III - Moon 14 - Svarog Clade Proving Complex', 30002411, 2502, 1000294, 135, '[\"bounty-missions\",\"courier-missions\",\"interbus\",\"reprocessing-plant\",\"market\",\"stock-exchange\",\"cloning\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]', 437751275520,-44579512320,-188002590720),
(60004687, '2019-09-29 20:56:21', '2019-09-29 20:56:21', 'Krirald VII - Moon 11 - Perun Clade Proving Complex', 30002079, 2502, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"interbus\",\"reprocessing-plant\",\"market\",\"stock-exchange\",\"cloning\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-862792212480, 119877918720,-2253946920960),
(60004837, '2019-09-29 20:56:21', '2019-09-29 20:56:21', 'Krirald VII - Moon 14 - Perun Clade Mutaplasmid Farm', 30002079, 2498, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-894189035520, 124242616320,-2260899962880),
(60006004, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka V - Veles Clade Porevitium Vault', 30002797, 2501, 1000292, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-342464471040,-1798348800, 374076579840),
(60006013, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka VI - Moon 2 - Veles Clade Proving Complex', 30002797, 2501, 1000292, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"storage\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-867150274560,-4562165760,-49196605440),
(60006016, '2019-09-29 20:58:06', '2019-09-29 20:58:06', 'Kaunokka II - Veles Clade Bioadaptation Chambers', 30002797, 2501, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-165041479680,-864706560,-30761410560),
(60009463, '2019-09-29 21:04:01', '2019-09-29 21:04:01', 'Vale II - Moon 1 - Veles Clade Extractive Terminus', 30005029, 3865, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-251167088640,-31931719680,-79759810560),
(60010438, '2019-09-29 20:44:37', '2019-09-29 20:44:37', 'Nani V - Moon 18 - Svarog Clade Bioadaptation Chambers', 30001413, 3869, 1000294, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"labratory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-1935938887680,-161174691840, 1613542563840),
(60010441, '2019-09-29 20:44:37', '2019-09-29 20:44:37', 'Nani VIII - Moon 2 - Svarog Clade Mutaplasmid Farm', 30001413, 3869, 1000294, 135, '[\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"labratory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 3117818880000, 259573555200, 8274600222720),
(60010762, '2019-09-29 21:04:02', '2019-09-29 21:04:02', 'Vale VI - Moon 2 - Veles Clade Semiosis Theater', 30005029, 3869, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"refinery\",\"market\",\"cloning\",\"surgery\",\"dna-therapy\",\"repair-facilities\",\"labratory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-653056942080,-83024732160, 789473648640),
(60011170, '2019-09-29 20:44:37', '2019-09-29 20:44:37', 'Nani IV - Moon 2 - The Convocation of Triglav Semiosis Theater', 30001413, 3870, 1000298, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 85487493120, 7117332480, 483025674240),
(60011173, '2019-09-29 20:44:37', '2019-09-29 20:44:37', 'Nani I - Svarog Clade Extractive Terminus', 30001413, 3870, 1000294, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-43320729600,-3603701760,-52562042880),
(60011968, '2019-09-29 21:03:53', '2019-09-29 21:03:53', 'Ignebaener VI - Moon 1 - Perun Clade Extractive Terminus', 30005005, 3868, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"surgery\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-1737391349760, 4925890560, 223827517440),
(60011974, '2019-09-29 21:03:53', '2019-09-29 21:03:53', 'Ignebaener IV - Perun Clade Semiosis Theater', 30005005, 3868, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"surgery\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]', 462474485760,-1315676160,-145623982080),
(60012337, '2019-09-29 20:44:26', '2019-09-29 20:44:26', 'Arvasaras IV - Moon 15 - Veles Clade Semiosis Theater', 30001381, 1932, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"interbus\",\"reprocessing-plant\",\"market\",\"stock-exchange\",\"cloning\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]', 563689758720, 83630039040,-826000957440),
(60015007, '2019-09-29 21:04:58', '2019-09-29 21:04:58', 'Komo IX - Perun Clade Proving Complex', 30031392, 1529, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-1250045583360, 59114987520,-392289607680),
(60015025, '2019-09-29 21:04:55', '2019-09-29 21:04:55', 'Sakenta I - Perun Clade Proving Complex', 30010141, 1529, 1000293, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-7010672640, 851189760,-55119667200),
(60015026, '2019-09-29 21:04:56', '2019-09-29 21:04:56', 'Senda III - Moon 1 - Veles Clade Proving Complex', 30020141, 1529, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]', 115114598400,-13954621440,-205875240960),
(60015028, '2019-09-29 21:04:59', '2019-09-29 21:04:59', 'Urhinichi IX - Svarog Clade Proving Complex', 30040141, 1529, 1000294, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-1791117434880, 217133015040,-1206734069760),
(60015120, '2019-09-29 21:05:03', '2019-09-29 21:05:03', 'Ichoriya VI - Veles Clade Extractive Terminus', 30045329, 4024, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"repair-facilities\",\"factory\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\"]',-1331274424320,-4797603840, 1248730767360),
(60015147, '2019-09-29 21:05:03', '2019-09-29 21:05:03', 'Ichoriya V - Veles Clade Mutaplasmid Farm', 30045329, 1530, 1000292, 135, '[\"bounty-missions\",\"courier-missions\",\"reprocessing-plant\",\"market\",\"cloning\",\"surgery\",\"repair-facilities\",\"fitting\",\"news\",\"insurance\",\"docking\",\"office-rental\",\"loyalty-point-store\",\"navy-offices\",\"security-offices\"]',-582453534720,-15661670400,-211588423680);

-- Delete the neighbor rows for Pochven systems
DELETE FROM `system_neighbour` WHERE systemId in (30000157,30000192,30001372,30001445,30002079,30002737,30005005,30010141,30031392,30000021,30001413,30002225,30002411,30002770,30003495,30003504,30040141,30045328,30000206,30001381,30002652,30002702,30002797,30003046,30005029,30020141,30045329);

-- Fixup the neighbor rows for systems that used to connect to Pochven systems
UPDATE `system_neighbour` set jumpNodes='30000018:30000020:30000022' where systemId=30000017;
UPDATE `system_neighbour` set jumpNodes='30000015:30000017' where systemId=30000018;
UPDATE `system_neighbour` set jumpNodes='30000128:30000129' where systemId=30000130;
UPDATE `system_neighbour` set jumpNodes='30000132:30000133:30000142:30001379' where systemId=30000138;
UPDATE `system_neighbour` set jumpNodes='30000131:30000154:30000155:30000156' where systemId=30000153;
UPDATE `system_neighbour` set jumpNodes='30000145:30000153:30000154' where systemId=30000156;
UPDATE `system_neighbour` set jumpNodes='30000189:30000191:30000193:30000194' where systemId=30000190;
UPDATE `system_neighbour` set jumpNodes='30000189:30000190:30000194' where systemId=30000191;
UPDATE `system_neighbour` set jumpNodes='30000190:30000201' where systemId=30000193;
UPDATE `system_neighbour` set jumpNodes='30000169:30000188:30000189:30000190:30000191' where systemId=30000194;
UPDATE `system_neighbour` set jumpNodes='30000193:30000202' where systemId=30000201;
UPDATE `system_neighbour` set jumpNodes='30000202:30000203' where systemId=30000207;
UPDATE `system_neighbour` set jumpNodes='30001368:30001415' where systemId=30001371;
UPDATE `system_neighbour` set jumpNodes='30001382:30001384:30002754' where systemId=30001380;
UPDATE `system_neighbour` set jumpNodes='30001383:30001384' where systemId=30001385;
UPDATE `system_neighbour` set jumpNodes='30001374:30001411' where systemId=30001410;
UPDATE `system_neighbour` set jumpNodes='30001367:30001444' where systemId=30001443;
UPDATE `system_neighbour` set jumpNodes='30001443:30001446' where systemId=30001444;
UPDATE `system_neighbour` set jumpNodes='30001444:30001447:30001448' where systemId=30001446;
UPDATE `system_neighbour` set jumpNodes='30000848:30001446:30001448' where systemId=30001447;
UPDATE `system_neighbour` set jumpNodes='30000205:30001446:30001447' where systemId=30001448;
UPDATE `system_neighbour` set jumpNodes='30002371:30002372' where systemId=30002376;
UPDATE `system_neighbour` set jumpNodes='30002408:30002409' where systemId=30002410;
UPDATE `system_neighbour` set jumpNodes='30002401:30003465' where systemId=30002412;
UPDATE `system_neighbour` set jumpNodes='30002648:30002649:30002651' where systemId=30002650;
UPDATE `system_neighbour` set jumpNodes='30002650:30002696' where systemId=30002651;
UPDATE `system_neighbour` set jumpNodes='30002654:30003090' where systemId=30002653;
UPDATE `system_neighbour` set jumpNodes='30002699:30002701' where systemId=30002700;
UPDATE `system_neighbour` set jumpNodes='30002648:30002699' where systemId=30002704;
UPDATE `system_neighbour` set jumpNodes='30002738:30002750' where systemId=30002739;
UPDATE `system_neighbour` set jumpNodes='30002741:30002742' where systemId=30002740;
UPDATE `system_neighbour` set jumpNodes='30001379:30002749:30002750:30002775' where systemId=30002752;
UPDATE `system_neighbour` set jumpNodes='30002767:30002772' where systemId=30002769;
UPDATE `system_neighbour` set jumpNodes='30002773:30002794' where systemId=30002771;
UPDATE `system_neighbour` set jumpNodes='30002782:30002788' where systemId=30002789;
UPDATE `system_neighbour` set jumpNodes='30000139:30002788:30002805' where systemId=30002791;
UPDATE `system_neighbour` set jumpNodes='30002771:30002795:30002799' where systemId=30002794;
UPDATE `system_neighbour` set jumpNodes='30002773' where systemId=30002798;
UPDATE `system_neighbour` set jumpNodes='30002815:30002819:30041392' where systemId=30002818;
UPDATE `system_neighbour` set jumpNodes='30003015:30003047:30003049:30003051:30003054' where systemId=30003045;
UPDATE `system_neighbour` set jumpNodes='30003045:30003048:30003050:30003054' where systemId=30003047;
UPDATE `system_neighbour` set jumpNodes='30003047:30003048:30003054:30003056' where systemId=30003050;
UPDATE `system_neighbour` set jumpNodes='30003045:30003049:30003053' where systemId=30003051;
UPDATE `system_neighbour` set jumpNodes='30003045:30003047:30003048:30003050:30003056' where systemId=30003054;
UPDATE `system_neighbour` set jumpNodes='30003050:30003054' where systemId=30003056;
UPDATE `system_neighbour` set jumpNodes='30003070:30003073:30003075' where systemId=30003074;
UPDATE `system_neighbour` set jumpNodes='30002050:30002077:30002080' where systemId=30002076;
UPDATE `system_neighbour` set jumpNodes='30002077:30002080:30002081' where systemId=30002078;
UPDATE `system_neighbour` set jumpNodes='30002076:30002078:30002081' where systemId=30002080;
UPDATE `system_neighbour` set jumpNodes='30002078:30002080' where systemId=30002081;
UPDATE `system_neighbour` set jumpNodes='30002220:30002223' where systemId=30002224;
UPDATE `system_neighbour` set jumpNodes='30002231:30003493:30003496' where systemId=30003494;
UPDATE `system_neighbour` set jumpNodes='30003498:30003499' where systemId=30003497;
UPDATE `system_neighbour` set jumpNodes='30003493:30003497' where systemId=30003498;
UPDATE `system_neighbour` set jumpNodes='30003501:30003503:30003506' where systemId=30003502;
UPDATE `system_neighbour` set jumpNodes='30003491:30003502:30003506:30004080' where systemId=30003503;
UPDATE `system_neighbour` set jumpNodes='30005006:30005008' where systemId=30005007;
UPDATE `system_neighbour` set jumpNodes='30004993:30005025:30005027' where systemId=30005026;
UPDATE `system_neighbour` set jumpNodes='30045322:30045325' where systemId=30045321;
UPDATE `system_neighbour` set jumpNodes='30045321:30045326:30045337' where systemId=30045322;
UPDATE `system_neighbour` set jumpNodes='30001403:30045314:30045325:30045326:30045327' where systemId=30045324;
UPDATE `system_neighbour` set jumpNodes='30045339:30045340:30045344' where systemId=30045342;

-- Re-add the Pochven systems with their new neighbors
INSERT INTO `system_neighbour` (regionId, constellationId, systemId, systemName, jumpNodes, trueSec) VALUES
(10000070, 20000788, 30045328, 'Ahtila', '30000021:30020141', -1.000000),
(10000070, 20000789, 30002652, 'Ala', '30000206:30005029', -1.000000),
(10000070, 20000789, 30003046, 'Angymonne', '30002702:30005029:30045329', -1.000000),
(10000070, 20000789, 30002702, 'Archee', '30003046:30005029', -1.000000),
(10000070, 20000789, 30001381, 'Arvasaras', '30002797:30010141', -1.000000),
(10000070, 20000788, 30002225, 'Harva', '30002770:30003495:30003504', -1.000000),
(10000070, 20000789, 30045329, 'Ichoriya', '30002797:30003046', -1.000000),
(10000070, 20000787, 30005005, 'Ignebaener', '30000157:30031392', -1.000000),
(10000070, 20000789, 30002797, 'Kaunokka', '30001381:30045329', -1.000000),
(10000070, 20000787, 30001372, 'Kino', '30000157:30001445', -1.000000),
(10000070, 20000787, 30031392, 'Komo', '30005005:30010141', -1.000000),
(10000070, 20000787, 30002737, 'Konola', '30001445:30002079', -1.000000),
(10000070, 20000787, 30002079, 'Krirald', '30000192:30002737', -1.000000),
(10000070, 20000788, 30000021, 'Kuharah', '30002770:30045328', -1.000000),
(10000070, 20000787, 30001445, 'Nalvula', '30000157:30001372:30002737', -1.000000),
(10000070, 20000788, 30001413, 'Nani', '30002411:30040141', -1.000000),
(10000070, 20000788, 30003504, 'Niarja', '30002225:30003495', -1.000000),
(10000070, 20000787, 30000192, 'Otanuomi', '30002079:30040141', -1.000000),
(10000070, 20000787, 30000157, 'Otela', '30001372:30001445:30005005', -1.000000),
(10000070, 20000788, 30003495, 'Raravoss', '30002225:30002411:30003504', -1.000000),
(10000070, 20000787, 30010141, 'Sakenta', '30001381:30031392', -1.000000),
(10000070, 20000789, 30020141, 'Senda', '30000206:30045328', -1.000000),
(10000070, 20000788, 30002411, 'Skarkon', '30001413:30003495', -1.000000),
(10000070, 20000788, 30002770, 'Tunudan', '30000021:30002225', -1.000000),
(10000070, 20000788, 30040141, 'Urhinichi', '30000192:30001413', -1.000000),
(10000070, 20000789, 30005029, 'Vale', '30002652:30002702:30003046', -1.000000),
(10000070, 20000789, 30000206, 'Wirashoda', '30002652:30020141', -1.000000);

-- Add new wormhole Attributes
INSERT INTO `type_attribute` (`id`, `typeId`, `attributeId`, `value`) VALUES
(974,56026,1381,25.0),
(975,56026,1382,720.0),
(976,56026,1383,1000000000.0),
(977,56026,1384,0.0),
(978,56026,1385,410000000.0),
(979,56026,1457,2925.0),
(980,56535,1381,25.0),
(981,56535,1382,720.0),
(982,56535,1383,1000000000.0),
(983,56535,1384,0.0),
(984,56535,1385,410000000.0),
(985,56535,1457,2926.0),
(986,56536,1381,25.0),
(987,56536,1382,720.0),
(988,56536,1383,1000000000.0),
(989,56536,1384,0.0),
(990,56536,1385,410000000.0),
(991,56536,1457,2927.0),
(992,56537,1381,25.0),
(993,56537,1382,720.0),
(994,56537,1383,1000000000.0),
(995,56537,1384,0.0),
(996,56537,1385,410000000.0),
(997,56537,1457,2938.0),
(998,56538,1381,25.0),
(999,56538,1382,720.0),
(1000,56538,1383,1000000000.0),
(1001,56538,1384,0.0),
(1002,56538,1385,410000000.0),
(1003,56538,1457,2988.0),
(1004,56539,1381,25.0),
(1005,56539,1382,720.0),
(1006,56539,1383,1000000000.0),
(1007,56539,1384,0.0),
(1008,56539,1385,410000000.0),
(1009,56539,1457,2990.0),
(1010,56545,1381,25.0),
(1011,56545,1382,720.0),
(1012,56545,1383,1000000000.0),
(1013,56545,1384,0.0),
(1014,56545,1385,410000000.0),
(1015,56545,1457,2928.0),
(1016,56546,1381,25.0),
(1017,56546,1382,720.0),
(1018,56546,1383,1000000000.0),
(1019,56546,1384,0.0),
(1020,56546,1385,410000000.0),
(1021,56546,1457,2929.0),
(1022,56547,1381,25.0),
(1023,56547,1382,720.0),
(1024,56547,1383,1000000000.0),
(1025,56547,1384,0.0),
(1026,56547,1385,410000000.0),
(1027,56547,1457,2930.0),
(1028,56548,1381,25.0),
(1029,56548,1382,720.0),
(1030,56548,1383,1000000000.0),
(1031,56548,1384,0.0),
(1032,56548,1385,410000000.0),
(1033,56548,1457,2931.0),
(1034,56549,1381,25.0),
(1035,56549,1382,720.0),
(1036,56549,1383,1000000000.0),
(1037,56549,1384,0.0),
(1038,56549,1385,410000000.0),
(1039,56549,1457,2932.0),
(1040,56550,1381,25.0),
(1041,56550,1382,720.0),
(1042,56550,1383,1000000000.0),
(1043,56550,1384,0.0),
(1044,56550,1385,410000000.0),
(1045,56550,1457,2933.0),
(1046,56551,1381,25.0),
(1047,56551,1382,720.0),
(1048,56551,1383,1000000000.0),
(1049,56551,1384,0.0),
(1050,56551,1385,410000000.0),
(1051,56551,1457,2934.0),
(1052,56552,1381,25.0),
(1053,56552,1382,720.0),
(1054,56552,1383,1000000000.0),
(1055,56552,1384,0.0),
(1056,56552,1385,410000000.0),
(1057,56552,1457,2935.0),
(1058,56553,1381,25.0),
(1059,56553,1382,720.0),
(1060,56553,1383,1000000000.0),
(1061,56553,1384,0.0),
(1062,56553,1385,410000000.0),
(1063,56553,1457,2936.0),
(1064,56554,1381,25.0),
(1065,56554,1382,720.0),
(1066,56554,1383,1000000000.0),
(1067,56554,1384,0.0),
(1068,56554,1385,410000000.0),
(1069,56554,1457,2937.0),
(1070,56555,1381,25.0),
(1071,56555,1382,720.0),
(1072,56555,1383,1000000000.0),
(1073,56555,1384,0.0),
(1074,56555,1385,410000000.0),
(1075,56555,1457,2939.0),
(1076,56556,1381,25.0),
(1077,56556,1382,720.0),
(1078,56556,1383,1000000000.0),
(1079,56556,1384,0.0),
(1080,56556,1385,410000000.0),
(1081,56556,1457,2940.0),
(1082,56557,1381,25.0),
(1083,56557,1382,720.0),
(1084,56557,1383,1000000000.0),
(1085,56557,1384,0.0),
(1086,56557,1385,410000000.0),
(1087,56557,1457,2941.0),
(1088,56558,1381,25.0),
(1089,56558,1382,720.0),
(1090,56558,1383,1000000000.0),
(1091,56558,1384,0.0),
(1092,56558,1385,410000000.0),
(1093,56558,1457,2942.0),
(1094,56559,1381,25.0),
(1095,56559,1382,720.0),
(1096,56559,1383,1000000000.0),
(1097,56559,1384,0.0),
(1098,56559,1385,410000000.0),
(1099,56559,1457,2943.0),
(1100,56560,1381,25.0),
(1101,56560,1382,720.0),
(1102,56560,1383,1000000000.0),
(1103,56560,1384,0.0),
(1104,56560,1385,410000000.0),
(1105,56560,1457,2944.0),
(1106,56561,1381,25.0),
(1107,56561,1382,720.0),
(1108,56561,1383,1000000000.0),
(1109,56561,1384,0.0),
(1110,56561,1385,410000000.0),
(1111,56561,1457,2945.0),
(1112,56562,1381,25.0),
(1113,56562,1382,720.0),
(1114,56562,1383,1000000000.0),
(1115,56562,1384,0.0),
(1116,56562,1385,410000000.0),
(1117,56562,1457,2946.0),
(1118,56563,1381,25.0),
(1119,56563,1382,720.0),
(1120,56563,1383,1000000000.0),
(1121,56563,1384,0.0),
(1122,56563,1385,410000000.0),
(1123,56563,1457,2947.0),
(1124,56564,1381,25.0),
(1125,56564,1382,720.0),
(1126,56564,1383,1000000000.0),
(1127,56564,1384,0.0),
(1128,56564,1385,410000000.0),
(1129,56564,1457,2948.0),
(1130,56565,1381,25.0),
(1131,56565,1382,720.0),
(1132,56565,1383,1000000000.0),
(1133,56565,1384,0.0),
(1134,56565,1385,410000000.0),
(1135,56565,1457,2989.0),
(1136,56542,1381,25.0),
(1137,56542,1382,960.0),
(1138,56542,1383,1000000000.0),
(1139,56542,1384,0.0),
(1140,56542,1385,375000000.0),
(1141,56542,1457,2951.0),
(1142,56541,1381,4.0),
(1143,56541,1382,960.0),
(1144,56541,1383,1000000000.0),
(1145,56541,1384,0.0),
(1146,56541,1385,375000000.0),
(1147,56541,1457,2950.0),
(1148,56544,1381,25.0),
(1149,56544,1382,960.0),
(1150,56544,1383,1000000000.0),
(1151,56544,1384,0.0),
(1152,56544,1385,375000000.0),
(1153,56544,1457,2953.0),
(1154,56540,1381,9.0),
(1155,56540,1382,960.0),
(1156,56540,1383,1000000000.0),
(1157,56540,1384,0.0),
(1158,56540,1385,375000000.0),
(1159,56540,1457,2949.0);

-- Add the new trailblazer stargates
INSERT INTO `stargate` VALUES
(50016556,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (F7-ICZ)',30001721,29625,30001957,156333219840.0,-31518105600.0,-215611269120.0),
(50016557,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Saminer)',30001957,29625,30001721,391347855360.0,56068055040.0,576970629120.0),
(50016555,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Kenninck)',30003605,29632,30003823,-1822204108800.0,329949634560.0,1073121239040.0),
(50016554,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Eggheron)',30003823,29632,30003605,-417477058560.0,-63676538880.0,-149838520320.0),
(50016552,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Pakhshi)',30003452,29634,30005198,2684707921920.0,-131821854720.0,-2202881925120.0),
(50016553,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Irgrus)',30005198,29634,30003452,276166041600.0,46430330880.0,-3976527421440.0),
(50016550,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Ahbazon)',30000134,3873,30005196,-125233274880.0,-7228416000.0,-102438051840.0),
(50016551,'2021-06-01 00:00:00','2021-06-01 00:00:00','Stargate (Hykkota)',30005196,3873,30000134,142878105600.0,3897139200.0,-600677867520.0);

-- fix systemNeighbours for new trailblazer gates
UPDATE `system_neighbour` set jumpNodes='30001719:30001720:30001957' where systemId=30001721;
UPDATE `system_neighbour` set jumpNodes='30001956:30001959:30001962:30001721' where systemId=30001957;
UPDATE `system_neighbour` set jumpNodes='30003604:30003606:30003823' where systemId=30003605;
UPDATE `system_neighbour` set jumpNodes='30003821:30003605' where systemId=30003823;
UPDATE `system_neighbour` set jumpNodes='30003449:30003450:30005198' where systemId=30003452;
UPDATE `system_neighbour` set jumpNodes='30004969:30004970:30005015:30005199:30003452' where systemId=30005198;
UPDATE `system_neighbour` set jumpNodes='30000132:30000135:30000136:30005196' where systemId=30000134;
UPDATE `system_neighbour` set jumpNodes='30005192:30005193:30000134' where systemId=30005196;
