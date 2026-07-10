-- luau.uwu Migration V2
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,
  trial_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'premium')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'crypto')),
  crypto_address TEXT,
  crypto_amount TEXT,
  proof_url TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- IP logs table
CREATE TABLE IF NOT EXISTS ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disposable email domains blocklist
CREATE TABLE IF NOT EXISTS blocked_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL
);

-- Insert common disposable email domains
INSERT INTO blocked_domains (domain) VALUES
  ('guerrillamail.com'), ('tempmail.com'), ('throwaway.email'), ('temp-mail.org'),
  ('mailinator.com'), ('yopmail.com'), ('guerrillamailblock.com'), ('grr.la'),
  ('dispostable.com'), ('sharklasers.com'), ('guerrillamail.info'), ('grr.la'),
  ('guerrillamail.biz'), ('guerrillamail.de'), ('guerrillamail.net'),
  ('guerrillamail.org'), ('guerrillamail.ro'), ('guerrillamailstore.com'),
  ('guerrillamail.tv'), ('guerrillamail.us'), ('grr.la'), ('gsy.de'),
  ('h8s.org'), ('hacpcc.com'), ('haltospam.com'), ('harakirimail.com'),
  ('hartbot.de'), ('hat-gansen.de'), ('hat-sellers.de'), ('hates-a-spy.com'),
  ('herp.in'), ('hidemail.de'), ('hidzz.com'), ('hmamail.com'),
  ('hopemail.biz'), ('hot-mail.cf'), ('hot-mail.co.uk'), ('hot-mail.com'),
  ('hot-mail.gq'), ('hot-mail.ml'), ('hot-mail.net'), ('hotmial.com'),
  ('hotpop.com'), ('hulapla.de'), ('hushmail.com'), ('ichimail.com'),
  ('imails.info'), ('inbax.tk'), ('inbox.si'), ('inboxclean.com'),
  ('inboxclean.org'), ('inboxproxy.com'), ('incognitomail.com'),
  ('incognitomail.org'), ('ineec.net'), ('infocom.zp.ua'), ('inoutmail.de'),
  ('inoutmail.info'), ('inoutmail.net'), ('insorg-mail.info'),
  ('ipoo.org'), ('irish2me.com'), ('iwi.net'), ('jetable.com'),
  ('jetable.fr.nf'), ('jetable.net'), ('jetable.org'), ('jnxjn.com'),
  ('jourrapide.com'), ('jsrsolutions.com'), ('junk1e.com'), ('junkmail.com'),
  ('junkmail.ga'), ('junkmail.gq'), ('kasmail.com'), ('kaspop.com'),
  ('keepmymail.com'), ('killmail.com'), ('killmail.net'), ('kingsq.ga'),
  ('kir.ch.tc'), ('klassmaster.com'), ('klassmaster.net'), ('klzlk.com'),
  ('kook.ml'), ('kostenlose-mailadresse.de'), ('kroweb.org'),
  ('kurzepost.de'), ('lawl.gq'), ('letthemeatspam.com'), ('lhsdv.com'),
  ('lifebyfood.com'), ('link2mail.net'), ('litedrop.com'), ('lol.ovpn.to'),
  ('lol.ovpn.to'), ('lookugly.com'), ('lopl.co.cc'), ('lortemail.dk'),
  ('lovemeleaveme.com'), ('lr78.com'), ('lroid.com'), ('lukop.dk'),
  ('m21.cc'), ('maboard.com'), ('mail-temporaire.fr'), ('mail.by'),
  ('mail.mezimages.net'), ('mail.zp.ua'), ('mail114.net'), ('mail1a.de'),
  ('mail21.cc'), ('mail2rss.org'), ('mail333.com'), ('mail4trash.com'),
  ('mailbidon.com'), ('mailblocks.com'), ('mailblog.biz'), ('mailbucket.org'),
  ('mailcat.biz'), ('mailcatch.com'), ('maildrop.cc'), ('maildrop.cf'),
  ('maildrop.club'), ('maildrop.ga'), ('maildrop.gq'), ('maildrop.ml'),
  ('maileater.com'), ('mailed.ro'), ('maileimer.de'), ('mailexpire.com'),
  ('mailfa.tk'), ('mailfork.email'), ('mailfree.ga'), ('mailfree.gq'),
  ('mailfree.ml'), ('mailfreeonline.com'), ('mailfs.com'), ('mailguard.me'),
  ('mailhazard.com'), ('mailhazard.us'), ('mailhz.me'), ('mailimate.com'),
  ('mailin8r.com'), ('mailinater.com'), ('mailinator.com'),
  ('mailinator.net'), ('mailinator.org'), ('mailinator.us'),
  ('mailinator2.com'), ('mailincubator.com'), ('mailismagic.com'),
  ('mailmate1.net'), ('mailme.ir'), ('mailme.lv'), ('mailme24.com'),
  ('mailmetrash.com'), ('mailmoat.com'), ('mailnator.com'),
  ('mailnesia.com'), ('mailnull.com'), ('mailorg.org'), ('mailpick.biz'),
  ('mailproxsy.com'), ('mailquack.com'), ('mailrock.biz'),
  ('mailsac.com'), ('mailscrap.com'), ('mailshell.com'),
  ('mailsiphon.com'), ('mailslite.com'), ('mailtemp.info'),
  ('mailtome.de'), ('mailtothis.com'), ('mailtrash.net'),
  ('mailtv.net'), ('mailtv.tv'), ('mailuntil.com'),
  ('mailzilla.com'), ('makemetheking.com'), ('manifestgenerator.com'),
  ('manybrain.com'), ('mbx.cc'), ('mega.zik.dj'), ('meinspamschutz.de'),
  ('meltmail.com'), ('messagebeamer.de'), ('mezimages.net'),
  ('mfsa.ru'), ('mierdamail.com'), ('migmail.pl'),
  ('migumail.com'), ('mindless.com'), ('ministry-of-silly-walks.de'),
  ('mintemail.com'), ('misterpinball.de'), ('mmmmail.com'),
  ('moakt.com'), ('mobi.web.id'), ('mobileninja.co.uk'),
  ('mohmal.com'), ('moncourrier.fr.nf'), ('monemail.fr.nf'),
  ('monmail.fr.nf'), ('monumentmail.com'), ('msa.minsmail.com'),
  ('mt2015.com'), ('mx0.wwwnew.eu'), ('my10minutemail.com'),
  ('myalias.pw'), ('mycard.net.ua'), ('mycleaninbox.net'),
  ('myemailboxy.com'), ('mymail-in.net'), ('mymailoasis.com'),
  ('mymailp.com'), ('mynetstore.de'), ('mypacks.net'),
  ('mypartyclip.de'), ('myphantom.com'), ('mysamp.de'),
  ('myspaceinc.com'), ('myspaceinc.net'), ('myspaceinc.org'),
  ('myspacepimpedup.com'), ('mytemp.email'), ('mytempemail.com'),
  ('mytempmail.com'), ('mytempmail.de'), ('mytempmail.org'),
  ('mytempmails.com'), ('mytmp.email'), ('mytrashmail.com'),
  ('nabala.com'), ('neomailbox.com'), ('nepwk.com'),
  ('nervmich.net'), ('nervtansen.de'), ('netmails.com'),
  ('netmails.net'), ('neverbox.com'), ('nice-4u.com'),
  ('nincsmail.hu'), ('nnh.com'), ('no-spam.ws'),
  ('noblepioneer.com'), ('nomail.xl.cx'), ('nomail2me.com'),
  ('nomorespamemails.com'), ('nonspam.eu'), ('nonspammer.de'),
  ('noref.in'), ('nospam.ze.tc'), ('nospam4.us'),
  ('nospamfor.us'), ('nospammail.net'), ('nospamthanks.info'),
  ('nothingtoseehere.ca'), ('nowmymail.com'), ('nurfuerspam.de'),
  ('nuts22.com'), ('nyc.com'), ('nyxmail.com'),
  ('o2.co.uk'), ('odnorazovoe.ru'), ('oneoffemail.com'),
  ('onewaymail.com'), ('oopi.org'), ('ordinaryamerican.net'),
  ('otherinbox.com'), ('ourklips.com'), ('outlawspam.com'),
  ('ovpn.to'), ('owlpic.com'), ('pancakemail.com'),
  ('pimpedupmyspace.com'), ('pjjkp.com'), ('plexolan.de'),
  ('poczta.onet.pl'), ('politikerclub.de'), ('poofy.org'),
  ('pookmail.com'), ('privacy.net'), ('privatdemail.net'),
  ('proxymail.eu'), ('prtnx.com'), ('punkass.com'),
  ('putthisinyouremail.com'), ('qq.com'), ('quickinbox.com'),
  ('quickmail.nl'), ('rcpt.at'), ('reallymymail.com'),
  ('realtyalerts.ca'), ('recode.me'), ('recursor.net'),
  ('regbypass.com'), ('regbypass.comsafe-mail.net'),
  ('rejectmail.com'), ('reliable-mail.com'), ('rhyta.com'),
  ('rklips.com'), ('rmqkr.net'), ('royal.net'),
  ('rppkn.com'), ('rtrtr.com'), ('s0ny.net'),
  ('safe-mail.net'), ('safersignup.de'), ('safetymail.info'),
  ('safetypost.de'), ('sandelf.de'), ('saynotospams.com'),
  ('scatmail.com'), ('schafmail.de'), ('schrott-email.de'),
  ('secretemail.de'), ('secure-mail.biz'), ('secure-email.eu'),
  ('selfdestructingmail.com'), ('sendspamhere.com'),
  ('shiftmail.com'), ('shitmail.me'), ('shitmail.org'),
  ('shitware.nl'), ('shmeriously.com'), ('shortmail.net'),
  ('sibmail.com'), ('sinnlos-mail.de'), ('skeefmail.com'),
  ('slaskpost.se'), ('slipry.net'), ('slopsbox.com'),
  ('slowslow.de'), ('slutty.horse'), ('smashmail.de'),
  ('smellfear.com'), ('snakemail.com'), ('sneakemail.com'),
  ('sneakymail.de'), ('snkmail.com'), ('sofimail.com'),
  ('sofort-mail.de'), ('softpls.asia'), ('sogetthis.com'),
  ('soodonims.com'), ('spam.la'), ('spam.su'),
  ('spam4.me'), ('spamavert.com'), ('spambob.com'),
  ('spambob.net'), ('spambob.org'), ('spambog.com'),
  ('spambog.de'), ('spambog.ru'), ('spambog.us'),
  ('spambot.me'), ('spambums.com'), ('spamcannon.com'),
  ('spamcannon.net'), ('spamcero.com'), ('spamcorptastic.com'),
  ('spamcowboy.com'), ('spamcowboy.net'), ('spamcowboy.org'),
  ('spamday.com'), ('spamex.com'), ('spamfighter.cf'),
  ('spamfighter.ga'), ('spamfighter.gq'), ('spamfighter.ml'),
  ('spamfree.eu'), ('spamfree24.com'), ('spamfree24.de'),
  ('spamfree24.eu'), ('spamfree24.info'), ('spamfree24.net'),
  ('spamfree24.org'), ('spamgoes.in'), ('spamgourmet.com'),
  ('spamgourmet.net'), ('spamgourmet.org'), ('spamherelots.com'),
  ('spamhereplease.com'), ('spamhole.com'), ('spamify.com'),
  ('spaminator.de'), ('spaml.com'), ('spaml.de'),
  ('spammotel.com'), ('spamobox.com'), ('spamoff.de'),
  ('spamslicer.com'), ('spamspot.com'), ('spamstack.net'),
  ('spamthis.co.uk'), ('spamthisplease.com'), ('spamtrail.com'),
  ('spamtrap.ro'), ('speed.1s.fr'), ('spoofmail.de'),
  ('stuffmail.de'), ('superrito.com'), ('superstachel.de'),
  ('suremail.info'), ('svk.jp'), ('sweetxxx.de'),
  ('tagyoureit.com'), ('talkinator.com'), ('tapchicuoihoi.com'),
  ('teewars.org'), ('teleworm.com'), ('teleworm.us'),
  ('temp-mail.org'), ('temp-mail.ru'), ('temp.bobrodob.com'),
  ('temp.fcomet.com'), ('temp.headstrong.de'), ('tempail.com'),
  ('tempanimo.com'), ('tempemail.biz'), ('tempemail.co.za'),
  ('tempemail.com'), ('tempemail.net'), ('tempemail.org'),
  ('tempemail.us'), ('tempemailbox.com'), ('tempemailco.za'),
  ('tempinbox.com'), ('tempmail.eu'), ('tempmail.it'),
  ('tempmail2.com'), ('tempmaildemo.com'), ('tempmailer.com'),
  ('tempmailer.de'), ('tempomail.fr'), ('temporarily.de'),
  ('temporarioemail.com.br'), ('temporaryemail.net'),
  ('temporaryemail.us'), ('temporaryforwarding.com'),
  ('temporaryinbox.com'), ('temporarymailaddress.com'),
  ('tempthe.net'), ('tempthe.net'), ('tempthe.net'),
  ('thankyou2010.com'), ('thc.st'), ('thecloudindex.com'),
  ('thetempmail.com'), ('throwawayemailaddress.com'),
  ('tittbit.in'), ('tizi.com'), ('tmailinator.com'),
  ('toiea.com'), ('toomail.biz'), ('topranklist.de'),
  ('tradermail.info'), ('trash-amil.com'), ('trash-mail.at'),
  ('trash-mail.com'), ('trash-mail.de'), ('trash-me.com'),
  ('trash2009.com'), ('trashdevil.de'), ('trashemail.de'),
  ('trashmail.at'), ('trashmail.com'), ('trashmail.de'),
  ('trashmail.me'), ('trashmail.net'), ('trashmail.org'),
  ('trashmail.ws'), ('trashmailer.com'), ('trashymail.com'),
  ('trashymail.net'), ('trillianpro.com'), ('turual.com'),
  ('twinmail.de'), ('tyldd.com'), ('uggsrock.com'),
  ('umail.net'), ('upliftnow.com'), ('uplipht.com'),
  ('venompen.com'), ('veryrealliemail.com'), ('vidchart.com'),
  ('viditag.com'), ('viewcastmedia.com'), ('viewcastmedia.net'),
  ('viewcastmedia.org'), ('vomoto.com'), ('vpn.st'),
  ('vsimcard.com'), ('vubby.com'), ('wasteland.rfc822.org'),
  ('webemail.me'), ('weg-werf-email.de'), ('wegwerfadresse.com'),
  ('wegwerfemail.com'), ('wegwerfemail.de'), ('wegwerfmail.de'),
  ('wegwerfmail.net'), ('wegwerfmail.org'), ('wetrainbayarea.com'),
  ('wetrainbayarea.org'), ('wh4f.org'), ('whatiaas.com'),
  ('whatpaas.com'), ('whyspam.me'), ('wikidocuslice.com'),
  ('winemaven.info'), ('wronghead.com'), ('wuzup.net'),
  ('wuzupmail.net'), ('wwwnew.eu'), ('xagloo.com'),
  ('xemaps.com'), ('xents.com'), ('xjoi.com'),
  ('xmaily.com'), ('xoxy.net'), ('yapped.net'),
  ('yeah.net'), ('yep.it'), ('yogamaven.com'),
  ('yomail.info'), ('yomp.com'), ('yopmail.com'),
  ('yopmail.fr'), ('yopmail.gq'), ('yopmail.net'),
  ('you-spam.com'), ('ypmail.webarnak.fr.eu.org'),
  ('yuurok.com'), ('zehnminutenmail.de'),
  ('10minutemail.co.za'), ('10minutemail.com'),
  ('binkmail.com'), ('bobmail.info'), ('bodhi.lawlita.com'),
  ('bofthew.com'), ('boun.cr'), ('bouncr.com'),
  ('breakthru.com'), ('brefmail.com'), ('brennendesreich.de'),
  ('broadbandninja.com'), ('bsnow.net'), ('bspamfree.org'),
  ('buffemail.com'), ('bugmenot.com'), ('bumpymail.com'),
  ('burnthespam.info'), ('bustmail.com'), ('buymoreplays.com'),
  ('buyusedlibrarybooks.org'), ('byom.de'), ('c2.hu'),
  ('cachedot.net'), ('casualdx.com'), ('cellurl.com'),
  ('centermail.com'), ('centermail.net'), ('chammy.info'),
  ('clerk.com'), ('clipmail.eu'), ('clrmail.com'),
  ('coldemail.info'), ('cool.fr.nf'), ('courriel.fr.nf'),
  ('courrieltemporaire.com'), ('crapmail.org'), ('crazymailing.com'),
  ('cubiclink.com'), ('curryworld.de'), ('cust.in'),
  ('cuvox.de'), ('d3amil.com'), ('dacoolest.com'),
  ('dandikmail.com'), ('dayrep.com'), ('dcemail.com'),
  ('deadaddress.com'), ('deadspam.com'), ('delikkt.de'),
  ('despammed.com'), ('devnullmail.com'), ('dfgh.net'),
  ('digitalsanctuary.com'), ('dingbone.com'), ('discard.email'),
  ('discardmail.com'), ('discardmail.de'), ('disposable.cf'),
  ('disposable.ga'), ('disposable.ml'), ('disposableaddress.com'),
  ('disposableemailaddresses.emailmiser.com'),
  ('disposableinbox.com'), ('dispose.it'), ('disposeamail.com'),
  ('disposemail.com'), ('dispostable.com'), ('dm.w3internet.co.uk'),
  ('dodgeit.com'), ('dodgit.com'), ('dodgit.org'),
  ('dontreg.com'), ('dontsendmespam.de'), ('drdrb.com'),
  ('drdrb.net'), ('droplar.com'), ('dropmail.me'),
  ('duam.net'), ('dudmail.com'), ('dump-email.info'),
  ('dumpandjunk.com'), ('dumpmail.de'), ('dumpyemail.com'),
  ('e-mail.com'), ('e-mail.org'), ('e4ward.com'),
  ('easytrashmail.com'), ('ee1.pl'), ('ee2.pl'),
  ('eelmail.com'), ('einmalmail.de'), ('einrot.com'),
  ('einrot.de'), ('eintagsmail.de'), ('email-fake.cf'),
  ('email-fake.com'), ('email-fake.ga'), ('email-fake.gq'),
  ('email-fake.ml'), ('email-fake.tk'), ('email-free.ml'),
  ('email-free.tk'), ('email60.com'), ('emailage.cf'),
  ('emailage.ga'), ('emailage.gq'), ('emailage.ml'),
  ('emailage.tk'), ('emaildienst.de'), ('emailgo.de'),
  ('emailias.com'), ('emailigo.de'), ('emailinfive.com'),
  ('emaillime.com'), ('emailmiser.com'), ('emailproxsy.com'),
  ('emailresort.com'), ('emails.ga'), ('emailsensei.com'),
  ('emailsending.eu'), ('emailspam.cf'), ('emailspam.ga'),
  ('emailspam.gq'), ('emailspam.ml'), ('emailspam.tk'),
  ('emailtEMP.COM'), ('emailthe.net'), ('emailtmp.com'),
  ('emailto.de'), ('emailwarden.com'), ('emailx.at.hm'),
  ('emailxfer.com'), ('emz.net'), ('enterto.com'),
  ('ephemail.net'), ('etranquil.com'), ('etranquil.net'),
  ('etranquil.org'), ('evopo.com'), ('explodemail.com'),
  ('express.net.ua'), ('eyepaste.com'), ('fakeinbox.com'),
  ('fakeinformation.com'), ('fakemail.fr'), ('fakemailz.com'),
  ('fammix.com'), ('fansworldwide.de'), ('fantasymail.de'),
  ('fastacura.com'), ('fastchevy.com'), ('fastchrysler.com'),
  ('fastkawasaki.com'), ('fastmazda.com'), ('fastmitsubishi.com'),
  ('fastnissan.com'), ('fastsubaru.com'), ('fastsuzuki.com'),
  ('fasttoyota.com'), ('fastyamaha.com'), ('fightallspam.com'),
  ('filzmail.com'), ('fixmail.tk'), ('fizmail.com'),
  ('fizyeta.com'), ('flyspam.com'), ('footard.com'),
  ('forgetmail.com'), ('fr33mail.info'), ('frapmail.com'),
  ('freemails.cf'), ('freemails.ga'), ('freemails.ml'),
  ('freundin.ru'), ('friendlymail.co.uk'), ('front14.org'),
  ('fuckingduh.com'), ('fudgerub.com'), ('fux0ringduh.com'),
  ('fyii.de'), ('garliclife.com'), ('gehensiuli.com'),
  ('get-mail.cf'), ('get-mail.ga'), ('get-mail.ml'),
  ('get-mail.tk'), ('get1mail.com'), ('get2mail.fr'),
  ('getairmail.cf'), ('getairmail.com'), ('getairmail.ga'),
  ('getairmail.gq'), ('getairmail.ml'), ('getairmail.tk'),
  ('getmails.eu'), ('getonemail.com'), ('getonemail.net'),
  ('ghosttexter.de'), ('girlsundertheinfluence.com'),
  ('gishpuppy.com'), ('goemailgo.com'), ('gorillaswithdirtyarmpits.com'),
  ('gotmail.com'), ('gotmail.net'), ('gotmail.org'),
  ('gowikibooks.com'), ('gowikicampus.com'), ('gowikicars.com'),
  ('gowikifilms.com'), ('gowikigames.com'), ('gowikimusic.com'),
  ('gowikinetwork.com'), ('gowikitravel.com'), ('gowikitv.com'),
  ('grandmamail.com'), ('grandmasmail.com'), ('great-host.in'),
  ('greensloth.com'), ('greermail.com'), ('guerillamail.biz'),
  ('guerillamail.com'), ('guerrillamail.biz'), ('guerrillamail.com'),
  ('guerrillamail.de'), ('guerrillamail.info'), ('guerrillamail.net'),
  ('guerrillamail.org'), ('guerrillamailblock.com'),
  ('guerrillamailstore.com'), ('guerrillamailtv.com'),
  ('guerrillamailus.com'), ('guerrillamailproxy.com'),
  ('guerrillamails.com'), ('guerrillamail.de'), ('guerrillamail.info'),
  ('guerrillamail.net'), ('guerrillamail.org'),
  ('guerrillamailblock.com'), ('guerrillamailstore.com'),
  ('guerrillamailtv.com'), ('guerrillamailus.com'),
  ('guerrillamailproxy.com'), ('guerrillamails.com'),
  ('gustr.com'), ('h8s.org'), ('hacpcc.com'),
  ('haltospam.com'), ('harakirimail.com'), ('hartbot.de'),
  ('hat-gansen.de'), ('hat-sellers.de'), ('hatpuppy.com'),
  ('hattonland.com'), ('hates-a-spy.com'), ('herp.in'),
  ('hidemail.de'), ('hidzz.com'), ('hmamail.com'),
  ('hopemail.biz'), ('hot-mail.cf'), ('hot-mail.co.uk'),
  ('hot-mail.com'), ('hot-mail.gq'), ('hot-mail.ml'),
  ('hot-mail.net'), ('hotmial.com'), ('hotpop.com'),
  ('hulapla.de'), ('hushmail.com'), ('ichimail.com'),
  ('imails.info'), ('inbax.tk'), ('inbox.si'),
  ('inboxclean.com'), ('inboxclean.org'), ('inboxproxy.com'),
  ('incognitomail.com'), ('incognitomail.org'), ('ineec.net'),
  ('infocom.zp.ua'), ('inoutmail.de'), ('inoutmail.info'),
  ('inoutmail.net'), ('insorg-mail.info'), ('ipoo.org'),
  ('irish2me.com'), ('iwi.net'), ('jetable.com'),
  ('jetable.fr.nf'), ('jetable.net'), ('jetable.org'),
  ('jnxjn.com'), ('jourrapide.com'), ('jsrsolutions.com'),
  ('junk1e.com'), ('junkmail.com'), ('junkmail.ga'),
  ('junkmail.gq'), ('kasmail.com'), ('kaspop.com'),
  ('keepmymail.com'), ('killmail.com'), ('killmail.net'),
  ('kingsq.ga'), ('klassmaster.com'), ('klassmaster.net'),
  ('klzlk.com'), ('kook.ml'), ('kostenlose-mailadresse.de'),
  ('kroweb.org'), ('kurzepost.de'), ('lawl.gq'),
  ('letthemeatspam.com'), ('lhsdv.com'), ('lifebyfood.com'),
  ('link2mail.net'), ('litedrop.com'), ('lol.ovpn.to'),
  ('lookugly.com'), ('lortemail.dk'), ('lovemeleaveme.com'),
  ('lr78.com'), ('lroid.com'), ('lukop.dk')
ON CONFLICT (domain) DO NOTHING;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_domains ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users can read own, server can do everything
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Purchases: users can read own, insert own
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- IP logs: users can read own
CREATE POLICY "Users can view own ip logs"
  ON ip_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Announcements: everyone can read active ones
CREATE POLICY "Anyone can view active announcements"
  ON announcements FOR SELECT
  USING (active = true);

-- Blocked domains: server only (no client access)
CREATE POLICY "No client access to blocked domains"
  ON blocked_domains FOR ALL
  USING (false);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_ip_logs_user_id ON ip_logs(user_id);
CREATE INDEX idx_ip_logs_ip ON ip_logs(ip_address);
CREATE INDEX idx_ip_logs_created ON ip_logs(created_at);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_announcements_active ON announcements(active);
