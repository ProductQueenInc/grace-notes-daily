-- GraceNotes Daily — Expand the "faith" posture verse pool (2026-09-15)
--
-- Found while investigating Cindy's "repetitive notes and verses" report:
-- select_verse_for_user() excludes anything a user has been sent in the last
-- 60 days, then falls back across the whole library if that posture is
-- exhausted. With only 2 verses tagged "faith" (used for anyone in the
-- "mature in faith" / elder phase), that posture's own pool runs out in two
-- days flat, well before "hope" (26 verses) or "purpose" (17). Not causing
-- literal repeats yet for anyone since Pass 2 falls back to the full
-- 123-verse library, but it means elder-phase users effectively never get a
-- verse that actually matches their stated phase after day 2 -- a latent
-- bug that gets worse the longer someone stays in that phase.
--
-- Adds 15 verses tagged with "faith" (several also cross-tagged with a
-- second posture where it fits), bringing that pool to 17 -- in line with
-- "purpose". NIV text, matching the app's existing verse table convention.
-- Cindy: worth a spot-check against actual NIV wording before this goes
-- fully live, same as any scripture text -- I'm confident in these (all
-- well-known passages) but did not look them up against a live Bible API.

-- verses.id has no default/identity configured on this table (a separate,
-- minor gotcha found while running this) -- explicit ids required.
insert into public.verses (id, theme, reference, text, posture_tags, is_active) values
(125, 'Faith', 'Hebrews 11:1', 'Now faith is confidence in what we hope for and assurance about what we do not see.', array['faith'], true),
(126, 'Faith', '2 Corinthians 5:7', 'For we live by faith, not by sight.', array['faith'], true),
(127, 'Faith', 'Hebrews 11:6', 'And without faith it is impossible to please God, because anyone who comes to him must believe that he exists and that he rewards those who earnestly seek him.', array['faith'], true),
(128, 'Faith', 'Romans 10:17', 'Consequently, faith comes from hearing the message, and the message is heard through the word about Christ.', array['faith'], true),
(129, 'Perseverance', 'James 1:2-3', 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.', array['faith','growth'], true),
(130, 'Faith', 'Mark 11:23', 'Truly I tell you, if anyone says to this mountain, "Go, throw yourself into the sea," and does not doubt in their heart but believes that what they say will happen, it will be done for them.', array['faith','courage'], true),
(131, 'Faith', 'Romans 1:17', 'For in the gospel the righteousness of God is revealed, a righteousness that is by faith from first to last, just as it is written: "The righteous will live by faith."', array['faith'], true),
(132, 'Faith', '1 Peter 1:7', 'These have come so that the proven genuineness of your faith, of greater worth than gold, which perishes even though refined by fire, may result in praise, glory and honor when Jesus Christ is revealed.', array['faith','growth'], true),
(133, 'Faith', 'Galatians 2:20', 'I have been crucified with Christ and I no longer live, but Christ lives in me. The life I live in the body, I live by faith in the Son of God, who loved me and gave himself for me.', array['faith'], true),
(134, 'Faith', 'Ephesians 6:16', 'In addition to all this, take up the shield of faith, with which you can extinguish all the flaming arrows of the evil one.', array['faith','courage'], true),
(135, 'Faith', '2 Timothy 4:7', 'I have fought the good fight, I have finished the race, I have kept the faith.', array['faith'], true),
(136, 'Faith', 'Hebrews 11:8', 'By faith Abraham, when called to go to a place he would later receive as his inheritance, obeyed and went, even though he did not know where he was going.', array['faith','courage'], true),
(137, 'Faith', 'Romans 4:20-21', 'Yet he did not waver through unbelief regarding the promise of God, but was strengthened in his faith and gave glory to God, being fully persuaded that God had power to do what he had promised.', array['faith','waiting'], true),
(138, 'Faith', 'Luke 17:5-6', 'The apostles said to the Lord, "Increase our faith!" He replied, "If you have faith as small as a mustard seed, you can say to this mulberry tree, \'Be uprooted and planted in the sea,\' and it will obey you."', array['faith','growth'], true),
(139, 'Faith', '1 Corinthians 16:13', 'Be on your guard; stand firm in the faith; be courageous; be strong.', array['faith','courage'], true);
