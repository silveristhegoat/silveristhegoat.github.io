# The script of the game goes in this file.

define n = Character(None)
define stranger = Character("???")
define drun = Character("Drun")
define fogovich = Character("Mr. Fogovich")
define mell = Character("Mr. Mell")
define announcer = Character("Announcer")
define student_a = Character("Student A")
define student_b = Character("Student B")
define mr_dep = Character("Mr. Dep")
define mr_burmalda = Character("Mr. Burmalda")
define mr_stroy = Character("Mr. Stroy")
define pe_teacher = Character("PE teacher")
define woman = Character("Woman")
default full = False
default charisma = 0
default respect = False
default accused_suspect = ""
default ending_name = ""
default persistent.unlocked_endings = []

init python:
    def unlock_ending(title):
        if title and title not in persistent.unlocked_endings:
            persistent.unlocked_endings.append(title)
            renpy.save_persistent()
image PE = "images/PE.jpg"
image drun = "images/drun.png"
image fogovich_sprite = "images/mrfogovich.png"
image pe_teacher_sprite = "images/PEteacher.png"
image mell_sprite = "images/mrmell.png"
image administration_office = "images/administrationoffice.jpg"
image doctors_office = "images/doctorsoffice.jpg"
image bedroom = "images/bedroom.webp"
image kitchen = "images/kitchen.jpg"
image busstop = "images/busstop.jpg"
image university = "images/university.jpg"
image mainhall = "images/mainhall.jpg"
image cafeteria = "images/cafeteria.webp"
image greathall = "images/greathall.webp"
image cabinet = "images/cabinet.jpeg"
image underground = "images/underground.jpg"
image securityoutside = "images/securityoutside.avif"
image securityroom = "images/securityroom.jpg"
image cave = "images/cave.webp"
image hammam = "images/hammam.webp"
image beach = "images/beach.jpg"
image bg1 = "images/bg1.jpeg"
image bg2 = "images/bg2.png"
image bg3 = "images/bg3.jpeg"
image currilicum_image = "images/currilicum.jpg"

transform mell_small:
    zoom 0.6
    xalign 0.5
    yalign 1.0

transform mell_big:
    zoom 0.8
    xalign 0.5
    yalign 1.0
    # zorder removed — use `onlayer overlay` when showing to place above textbox

transform mell_above:
    zoom 0.85
    xalign 0.5
    yalign 0.60


label beginning:

    scene black

    n "Kõik on pime."
    n "Hakkad midagi helisevat kuulma."
    scene bedroom with dissolve
    n "Kui avad silmad, mõistad, et see on su äratuskell."
    n "Avad silmad täielikult ja lülitad äratuskella välja."

    $ player_name = renpy.input("Sisesta oma nimi").strip()
    if player_name == "":
        $ player_name = "Protag"
    $ protag = Character(player_name)

    protag "Ah, täna on ilus hommik."
    protag "Tundub, et jõudsin täpselt õigeks ajaks oma vastuvõtuks kõige paremasse kooli Eestis, The Coolest Eesti University."
    protag "Ütlevad, et kui lõpetad, siis on elus edu garanteeritud. Kuuekohaline palk on peaaegu kindel."
    protag "Ja sa ei saa vastuvõttu vahele jätta! Sul on ainult üks päev, kui jääd ilma, siis ei tule tagasi."
    protag "Noh, aeg valmistuda."

    n "Sa tõused üles, pesed hambad ja riided selga."
    scene kitchen with dissolve
    n "Sa lähed kööki."

    protag "(Tundub, et ema läks kuhugi, vähemalt jättis hommikusöögi)"

    menu:
        "Söö hommikusööki":
            n "Sööd hommikusöögi, see on maitsev."
            $ full = True
            protag "M-mmm."
            protag "Oi, buss tuleb varsti, pean kiirustama!"
            scene busstop with dissolve
            n "Sa tormad bussipeatusse."
            protag "Kurat, jäin hiljaks! Pean takso tellima..."
            n "Taksojuht saabub ja viib sind ülikooli."

        "Mul pole selleks aega":
            protag "Pean bussile jõudma. Jätan selle hilisemaks."
            n "Sulle õnnestub bussile jõuda."
            protag "Vaevu sain kätte..."
            $ full = False

    n "10 minutit hiljem..."
    scene university with dissolve
    protag "Seal see on, The Coolest Eesti University! Arvan, et kutsel oli kirjas... minge Great Hall'i."
    n "Sa sisened ülikooli."

    return


# The game starts here.

label start:

    play music "audio/beginning.mp3" fadein 1.0
    call beginning
    stop music fadeout 1.0

    call main_story


label main_story:

    play music "audio/ost4.mp3" fadein 1.0

    scene mainhall with dissolve
    protag "(Kurat, see koht on hiiglaslik!)"

    stranger "Tere, mis toimub. Kas ka sinu esimene päev siin?"

    protag "Tere, jah. Kas sa tead, kus on Great Hall?"

    stranger "Mine vasakule ja siis ühe korruse üles, näed seda. Igatahes, kõne ei alga veel tund aega, ma olen selle koha juba läbi uurinud, miks ma ei võiks sulle ülikooli ringkäiku teha?"

    protag "Muidugi!"

    stranger "Suurepärane! Mu nimi on Drun, mis sinu nimi on?"

    protag "[player_name]"

    show drun onlayer master

    menu:
        "Kiida tema ülikonda":
            protag "Samuti, see on kena ülikond!"
            drun "Aitäh! See oli eritellimusel. Ma lihtsalt armastan roose."
            $ charisma += 1
            drun "Igatahes, tule järgi."

        "Ära ütle midagi":
            drun "Okei, tule järgi."

    drun "Alustame kohast, kus me praegu oleme, Main Hall. Siin saad riideid vahetada ja näha kooli kaarti."

    scene cafeteria with dissolve
    show drun onlayer master
    drun "See on sööklad, iga päev kell 12:30 saab tasuta toidu."

    scene PE with dissolve
    show drun onlayer master
    drun "Järgmiseks on PE Hall, siin saad vabal ajal sporti teha."

    n "Mõni aeg möödub."

    scene greathall with dissolve
    show drun onlayer master
    drun "Ja lõpuks Great Hall. Siin kuuleme Mr. Fogovich'i kõnet ja pärast kõnet toimub vastuvõtt!"
    drun "Oi, kõne hakkab varsti pihta, võtame head kohad."

    n "Sa ja Drun istute peaaegu ees."

    show drun onlayer master
    drun "Muide, ma ei rääkinud sulle ühest väga olulisest kohast selles koolis, sa näed seda vastuvõtu ajal!"

    protag "Miks sa ei räägi sellest nüüd?"

    show drun onlayer master
    drun "See rikub üllatuse, usu mind bro."

    hide drun
    show fogovich_sprite onlayer master
    fogovich "Khm-khm."

    stop music fadeout 1.0

    n "..."

    fogovich "Aitäh. Alustan oma kõnet."
    fogovich "Täna, sellel ilusal päeval, liitute Eesti eliitülikooliga, või miks mitte öelda, kogu maailma eliidiga!"
    fogovich "Meie jaoks on üliõpilased kõige tähtsamad. Nad-"

    n "Viis minutit hiljem..."

    fogovich "Lõpetuseks alustame teie vastuvõttu. Mr. Mell näitab teile kohta ja selgitab protseduuri."
    hide fogovich_sprite
    hide fogovich_sprite
    hide fogovich_sprite
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Aitäh Mr. Fogovich. Head tudengid, kuna teid on nii palju, ei saa me kõiki korraga vastu võtta."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Palun tõmmake juhuslik paber sellest kausist. Teile määratakse grupinumber."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Kutsume korraga ühe grupi, kuulutus ütleb, milline grupp ja kuhu peate minema."

    hide fogovich_sprite
    n "Sa tõmbad paberi ja lahti harutad selle."
    n "Sulle tuli number 1."

    protag "Vaata, sain numbri 1!"
    show drun onlayer master
    drun "Õnnega, mul on number 4..."
    protag "Loodetavasti ei kesta see kaua."

    n "Õpilased lõpetavad kaartide tõmbamise ja lahkuvad Great Hall'ist, oodates oma korda."

    announcer "Grupp 1, palun tulge kabinetti R205."

    show drun onlayer master
    drun "Noh, näeme hiljem. Head lõbu!"
    protag "Sina ka!"

    play music "audio/ost3.mp3" fadein 1.0

    scene cabinet with dissolve
    n "Sa lähed kabinetti."
    show mell_sprite at mell_above onlayer overlay

    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Tere päevast, tudengid, ma selgitan teile vastuvõtu protsessi enne kui alustame."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Me peame minema ülikooli maa-alusesse ossa, kohta nimega \"Hammam\" (türgi saun)"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Teid pritsitakse vahuga ja peate seal olema 20 minutit."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Pärast seda loetakse teie vastuvõtt lõpetatuks ja saate homme alustada õpingutega."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Kui te mingil põhjusel vastuvõttu ei lõpeta... ei saa te sellest koolist kunagi osa võtta."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Need on reeglid, kas mõistate?"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    student_a "Jah!"

    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Järgne mulle."

    scene underground with dissolve
    n "Sa ja teised tudengid kõnnite Mr. Melliga maa-alusesse. Tunnete ennast kergelt ebamugavalt."
    show mell_sprite at mell_above onlayer overlay
    n "Sa vahetad selga Hammami jaoks sobivad riided."

    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Alustame."

    stop music fadeout 1.0

    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Mis jama see on?!?!?!?!?"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    protag "Hmm? Mis juhtus, Mr. Mell?"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Hammam! See... on... kadunud!"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    protag "M-mis?! Kuidas see üldse võimalik on?"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Ma ei tea... aga mingi pöörane loll selle tegi!"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Ilma Hammamita vastuvõttu ei saa toimuda."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    student_a "Kas see on tõesti vajalik..? Tundub kuidagi naeruväärne."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "See on täiesti vajalik."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    student_b "Kas me ei võiks siis kasutada mõnda teist Hammamit?"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Ei... see on eriline. Peame leidma süüdlase."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Noh... teie peate. Mul pole seda tingimata teha."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    protag "Mida sa mõtled?! Sa pead meid aitama!"
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Ära muretse, noor, ma püüan parimal moel aidata. Pane selga oma tavalised riided."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Teen Great Hall'is 15 minuti pärast teadaande. Pean seda esmalt kõrgematega arutama."

    n "Sa paned riided selga ja lähed tagasi Main Hall'i."

    scene mainhall with dissolve
    n "Tundub, et nad teatasid olukorrast. Kõik arutavad seda."
    protag "(Pean midagi ette võtma... Mitte ainult enda pärast, vaid kõigi pärast.)"
    protag "(Pean leidma süüdlase ja tooma Hammami tagasi!)"
    protag "(Aga mida ma praegu peaksin tegema?)"

    play music "audio/ost1.mp3" fadein 1.0

    menu:
        "Otsi Drunit":
            jump drun_path

        "Mõtle, mida teha":
            jump looking_for_drun

    return


label looking_for_drun:

    n "Hmmm..."
    n "Saalis märkad meest, kes meeleheitlikult midagi... või kedagi otsib."
    mr_dep "Ah, oledki siin!"
    protag "Uh, vabandust, kas ma tunnen sind?"
    mr_dep "Vabandust, et nii äkki, las ma tutvustan end."
    mr_dep "Olen Mr. Dep administratsioonist, olen otsinud kedagi, kes meid aitaks."
    mr_dep "Sa olid esimese grupiga, eks? Mr. Mell ütles, et sa võiksid aidata."
    protag "Kuidas ma saan aidata?"
    mr_dep "Arvan, et suudad aidata meil Hammamit leida ja ehk isegi leida selle teo taga olnud süüdlane."
    protag "Kas ma saan selle eest midagi vastu?"
    mr_dep "Noh, sul on ülikooli alustamiseks Hammam vajalik, aga lisaks anname sulle muidugi palju tasusid, kui õnnestud."
    mr_dep "Kui sa ei taha, siis pole sul kohustust, leiame kellelgi teise."

    menu:
        "Olgu, aitan":
            jump help_mr_dep

        "Ei, vabandust (Leia Drun)":
            jump drun_path


label help_mr_dep:

    mr_dep "Hea küll, suurepärane! Suur tänu. Niisiis, teema on järgmine."
    mr_dep "Me teame, et süüdlane on kuskil selles koolis, täpsemalt üks neist peagi üliõpilastest."
    mr_dep "Pead inimestelt küsitlema ja vihjete põhjal välja selgitama, kes on tõeline süüdlane."
    protag "Kas te ei saaks seda ise teha?"
    mr_dep "Meil on praegu palju tööd. See 'konflikt' võib saada avalikuks. Usku mind, me teeme palju tööd taga."
    protag "Kust ma peaksin alustama?"
    mr_dep "Otsi tudengeid või personali, kes olid siin enne tänast — ehk nad nägid midagi."
    mr_dep "Küsi nii paljudelt inimestelt kui võimalik."
    mr_dep "Kui arvad, et oled leidnud süüdlase, tule mulle teatama. Me räägime temaga."
    mr_dep "Saad aru?"
    protag "Jah!"
    mr_dep "Hea, Protag, soovin sulle õnne."
    n "Mr. Dep jookseb kiiresti minema."
    protag "Hea küll, alustan PE Hall'ist."
    scene PE with dissolve

    jump pe_hall


label drun_path:
    protag "Võib-olla peaksin Drunit otsima, ehk ta saab aidata."
    n "Sa hakkad koolis Drunit otsima, kuni leiad ta lõpuks sööklast."
    scene cafeteria with dissolve
    show drun onlayer master
    protag "Tere, sõber, mis toimub?"
    drun "Oh, tere! See oled sina, Protag. Mis sind siia toob?"
    protag "Ma ei teadnud, mida teha, nii et otsustasin sind otsida."
    protag "..."
    protag "Oota, mul on idee!"
    drun "Milline idee?"
    protag "Me peaksime koos Hammamit otsima!"
    drun "Hammam? Sa tõesti arvad, et administratsioon ei suuda seda ise leida?"
    protag "Me ei tea, kas nad õnnestuvad, peaksime proovima aidata — meie tulevik on mängus!"
    drun "Jah, õige. Kust alustame?"
    protag "Seda... ma ei ole mõelnud."
    drun "Mis siis, kui vaatame turvakaamerate salvestusi?"
    protag "Nad ei lase meil seda vaadata. Lisaks on see ilmselt kustutatud."
    drun "Hiilime lihtsalt sisse. Mul on vahend, millega salvestust taastada."
    protag "Sina? Üliõpilane?"
    drun "Ära alahinda mu oskusi. Olen IT-d õppinud lapsepõlvest saadik."
    drun "See USB-pulk saab salvestuse kätte, kui vaid pääseme turvaarvutisse."
    protag "Hea küll, üks probleem lahendatud, aga kuidas turvaruumi sisse saada?"
    drun "Saame sinna esmalt."
    scene securityoutside with dissolve
    show drun onlayer master
    n "Mõlemad lähete teisele korrusele, kus turvaruum asub. Siin pole palju inimesi."
    n "Näed naist turvaruumi lähedal telefonis."
    drun "See naine on tõenäoliselt turvatöötaja."
    drun "Ta on hajevil, aga märkab meid, kui proovime sisse hiilida."
    drun "Uksegi paistab olevat lukustamata."
    protag "Mida me siis teeme?"
    drun "Sa paned USB pulga sisse, mina sedastan temaga vestlust, kuni sa salvestuse alla laadid."

    menu:
        "Okei":
            protag "Okei, valmis?"
            drun "Jah, kui ta ei vaata, mine tuppa."
            n "Drun läheneb naisele ja alustab vestlust."
            protag "Ta on hajevil, nüüd on minu võimalus!"
            scene securityroom with dissolve
            n "Sa jooksed vaikselt turvaruumi, kus näed arvutit mitme ekraaniga, mis näitavad, mis kooli sees ja väljas toimub."
            protag "Kõik, mis pean tegema, on USB sisse panna ja oodata."
            n "Mõne aja pärast on salvestus alla laaditud."
            protag "Pean lahkuma, kiiresti!"
            n "Sa kõnnid kiirelt turvaruumist välja."
            scene securityoutside with dissolve
            show drun onlayer master
            n "Drun on endiselt turvatöötajaga rääkimas."
            n "Niipea kui ta sind märkab, lõpetab ta vestluse sinuga."
            drun "Sain salvestuse kätte?"
            protag "Jah, see peaks kõik siin olema."
            drun "Suurepärane! Vaatame seda Main Hall'is."
            scene mainhall with dissolve
            show drun onlayer master
            n "Mõlemad lähete alla ja hakkate mängima eile lindistatud materjali, otsides midagi kahtlast."
            protag "Vaata seda. Salvestus katkeb umbes tunniks ajaks, seejärel ilmub välja veoauto ja sõidab minema!"
            drun "Näed, kuhu see läks?"
            protag "Tundub, et... see sõidab koopasse?"
            protag "Peaksime seda uurima! See on tõenäoliselt seal!"
            drun "Oled kindel? See kõlab üsna hirmutavalt ja mis siis, kui me eksime?"
            protag "Saame hakkama... ilmselt. Tulge, lähme."
            drun "Olgu siis..."
            n "Koobas on päris kaugel, nii et otsustate takso tellida."
            scene cave with dissolve
            show drun onlayer master
            n "Umbes 10 minuti pärast jõuate koopasse."
            protag "Vaatame seda lähemalt."
            n "Hakkad koopast ringi uurima, märgistades kohti ja jälgides oma teekonda, et mitte eksida."
            n "Pärast mis tundub nagu igavikku, leiate lõpuks otsitu."
            protag "Hammam! Leidsime selle! Ma ütlesin sulle—"
            stop music fadeout 1.0
            play music "audio/ost5.mp3" fadein 1.0
            drun "Vabandust, aga ma ei saa lubada, et sa räägid neist."
            drun "See Hammam... ma ei saa lasta kellelgi teisel seda omada."
            drun "See on väga eriline Hammam."
            drun "Vastuvõtureeglite kohaselt peab inimene Hammamis olema maksimaalselt 20 minutit."
            drun "Aga miks ainult 20 minutit?"
            drun "Noh, kuulujutud ütlevad, et kui viibid üle 20 minuti, hakkab midagi imelikku toimuma — sa hakkad tõusma või midagi sellist."
            protag "See kõlab naeruväärselt! See ei saa tõsi olla!"
            drun "Kuidas sa siis seletad mitmeid tudengite kadumisi pärast seda, kui nad otsustasid Hammamis kauem kui 20 minutit olla?"
            drun "Eelmise aasta juhtumeid üritati maha vaikida, aga mina suutsin neist teada saada!"
            protag "Ma... ähh..."
            drun "Isegi kui sa ei ütleks neile, ei saa ma endale lubada tunnistajate jätmist."
            drun "Viimane sõna?"
            protag "..."

            if charisma >= 1:
                menu:
                    "Proovi teda veenda":
                        protag "Kuula, Drun, sa ei pea seda tegema."
                        drun "Tõesti? Miks?"
                        protag "Mõtle teistele tudengitele, nende tulevikule! Sa hävitad nende elu vaid kuulujuttude pärast!"
                        drun "..Mind ei huvita nad!"
                        protag "Olgu... kui sind ei veena, pean ma midagi kasutama..."
                        drun "Mida?"
                        protag "Sõpruse ja halva kirjutamise jõud!"
                        drun "Mis???"
                        stop music fadeout 1.0
                        n "Paned mõlemad käed ette ja hakkad laadima vikerkaarelaserit"
                        protag "RAHHHHHHH!!!!!"
                        n "Lased laseri lahti."
                        drun "ARGHHHHHHHHHHH!!!!!!! NOOO!"
                        drun "SEE ON... LIIGA TUGEVA!"
                        drun "AHHHHHHHHHHHHHHHHHHHHHHHH!!!!"
                        n "Drun kokkuvariseb põrandale."
                        protag "Drun!"
                        play music "audio/ost4.mp3" fadein 1.0
                        n "Lähed Druni juurde, et teda kontrollida."
                        drun "Ugh.. Mu pea keerleb..."
                        drun "Oota, kas see on relv?"
                        drun "!- Ma mäletan nüüd!"
                        drun "Ma ei usu, et ma oleksin seda teinud... Mul on tõesti kahju, vend."
                        protag "Andestan sulle, kui me läheme kooli administratsioonile rääkimisega."
                        drun "Sa ei ütle neile, et mina seda tegin?"
                        protag "Ma ei ütle, aga peame kiirustama."
                        drun "...Aitäh, vend. Sa oled tõeline."
                        drun "Olgu, lähme!"
                        n "Mõlemad jõuate kiiresti koopast välja ja istute taksosse."
                        n "Jõuate kooli."
                        protag "Ärme raiska rohkem aega."
                        scene administration_office with dissolve
                        show fogovich_sprite onlayer master
                        n "Tormate kiiresti administratsiooni kontorisse, et Mr. Fogovich'it teavitada."
                        fogovich "Tere, tudengid, kuidas saan aidata?"
                        protag "Härra, me leidsime Hammami."
                        fogovich "Olete seda ise näinud?"
                        protag "Jah! See on koopas kooli lähedal, võin kaardil näidata."
                        fogovich "Mõistan... Saadan mehed selle kinnitamiseks."
                        fogovich "Soovin siiski uurida, kuidas te koopast teada saite."
                        protag "Noh, ma hiilisin turvaruumi, kust leidsime kaamera salvestuse, ja sealt selgus, et Hammam oli koopas."
                        fogovich "Huvitav. Kas tead, kes süüdlane on?"
                        protag "Ei... salvestuselt ei näinud seda selgelt ja Hammami läheduses ei olnud kedagi."
                        fogovich "Olgu, istuge hetkeks. Ootame kinnitust."
                        n "Pärast 8 minutit saab Mr. Fogovich telefonikõne."
                        n "Tema näol paistab õrn naeratus."
                        fogovich "Palju õnne, härrased. Te tegite head tööd. Hammam oli tõepoolest koopas."
                        fogovich "Alustame vastuvõttu nii ruttu kui võimalik."
                        fogovich "Aga palun järgmine kord küsige abi, selle asemel et sisse hiilida ja varastada meie vara."
                        protag "Me teeme nii! Vabandust, härra."
                        protag "(sosistades) Sa ütlesid, et me ei võiks neilt küsida!"
                        drun "Hei mees, sa tead, miks ma seda ütlesin, eks?"
                        protag "Misiganes."
                        fogovich "Palun valmistuge vastuvõtuks. Meil pole kogu päeva aega."
                        n "Mõlemad lähete kooli sissepääsu juurde."
                        drun "Hei, bro?"
                        protag "Jah?"
                        stop music fadeout 1.0
                        drun "Aitäh veelkord."
                        n "Päev on päästetud ja sina ja Drun jääte pärast seda lähedaseks."
                        $ ending_name = "GOOD ENDING - Bros For Life"
                        jump ending_to_menu

                    "Torma talle kallale":
                        protag "RAHHHHH!!!!!"
                        drun "Mis nüüd, mees... see?"
                        drun "Sa oled relvutu ja tormad relvastatud mehe poole."
                        drun "Arvatavasti nimetatakse seda \"meeleheitluseks\"."
                        n "Enne kui jõuad Druni, peatud järsku."
                        n "Sa märkad verd, mis voolab sinu kaelast."
                        drun "Sa ei oleks pidanud edasi kaevama. Me oleksime võinud sõbrad jääda."
                        n "Sinu häälepaelad on lõigatud, sa ei suuda midagi öelda."
                        drun "Noh... ma lahkun nüüd. Head aega, Protag."
                        scene black with dissolve
                        n "Kukud põrandale, veered ja vaatad Hammamit."
                        n "Mõistad, et sind ei saa päästa, see ongi lõpp."
                        n "Otsustad oma saatusse leppida."
                        n "..."
                        $ ending_name = "BAD ENDING - Stage 5"
                        jump ending_to_menu

            else:
                menu:
                    "Proovi teda veenda":
                        protag "Kuula, Drun, sa ei pea seda tegema."
                        drun "Tõesti? Miks?"
                        protag "Noh... Sa tead, teised tudengid vajavad ka Hammamit? See on natuke isekas selle kõigi endale jätta."
                        drun "Miks mind see huvitab?"
                        protag "Noh..."
                        drun "Lõpeta aja raiskamine. See lõpeb nüüd."
                        protag "Oota, äh-"
                        n "Enne kui jõuad lauset lõpetada, tunned, et midagi libiseb sinu alakehast."
                        n "pauk"
                        n "Kõik muutub mustaks"
                        n "Tundub, et see ongi kõik..."
                        n "See ei ole kindlasti parim viis lahkuda"
                        n "Aga mis iganes."
                        n "..."
                        $ ending_name = "BAD ENDING - \"B&B\""
                        jump ending_to_menu

                    "Torma talle kallale":
                        protag "RAHHHHH!!!!!"
                        drun "Noh, mees... see?"
                        drun "Sa oled relvata ja tormad relvastatud mehe poole."
                        drun "Arvatavasti nimetatakse seda \"meeleheitluseks\"."
                        n "Enne kui jõuad Druni, peatud järsku."
                        n "Märkad, et su kaelast voolab veri."
                        drun "Sa ei oleks pidanud edasi kaevama. Me oleksime võinud sõbrad jääda."
                        n "Sinu häälepaelad on lõigatud, sa ei suuda midagi öelda."
                        drun "Noh... ma lahkun nüüd. Head aega, Protag."
                        n "Sa kukud põrandale, rullud ümber ja vaatad Hammamit."
                        n "Sa mõistad, et sind ei saa päästa; see ongi lõpp."
                        n "Otsustad oma saatusse leppida."
                        n "..."
                        $ ending_name = "BAD ENDING - Stage 5"
                        jump ending_to_menu

        "Kuidas oleks, kui me vahetaksime?":
            jump fall_path


label fall_path:
    show drun onlayer master
    drun "Tahad vahetada? Ma mõtlen, okei, aga kas sa tõesti suudad seda teha?"
    protag "Muidugi, sõber. Ära kahtle."
    drun "Okei, oled sa valmis?"
    protag "Jah."
    n "Astud naise juurde."
    hide drun
    woman "Tere, kas saan aidata?"
    n "Hakkad temaga flirtima; üllataval kombel oled selles päris osav."
    n "Paar minuti pärast märkad, et Drun pole ikka veel väljas."
    protag "(Kurat! Mis tal nii kaua võtab?!)"
    woman "Mulle meeldis sinuga rääkida, aga pean nüüd töö juurde tagasi minema. Jätan sulle oma numbri, kirjutame hiljem!"
    protag "Uh, okei. Näeme!"
    n "Kui naine ust avab, näeb ta Drunit."
    woman "Ah! Kes sa oled? Mine siit kohe!"
    drun "####!"
    n "Drun haarab kiiresti USB-pulga ja jookseb minema."
    woman "Parem mitte näha sind siin ringi, või räägin administratsioonile!"
    stop music fadeout 1.0
    scene mainhall with dissolve
    show drun onlayer master
    n "Mõlemad taandute esimesele korrusele, püüdes personali vältida."
    protag "Kurat! Mis sul nii kaua võttis?!"
    drun "...Vabandust, okei?! USB-l läks midagi viltu, see ei suutnud salvestust alla laadida ükskõik mida me proovisime!"
    protag "Noh, turvavideo ei tule kõne alla. Mida me nüüd teeme?"
    drun "Ma ei tea. Mul pole enam ideid..."
    protag "Sellise tempoga me Hammamit kunagi ei leia."
    protag "Võib-olla võiksime tudengitelt küsida?"
    drun "Kahtlen, et nad midagi teavad, aga mida meil kaotada on?"
    protag "Lähme."
    n "Sa ja Drun külastate kabinetti kabineti haaval, küsitledes tudengitelt, kas neil on mingit infot."
    n "Välja arvatud mõned ebausaldusväärsed ja rumalad kuulujutud, sa ei leia mingit teavet."
    protag "Mitte midagi..."
    n "Kui vaatad aknast välja, märkad, et päike hakkab aeglaselt loojuma."
    n "Isegi kui Hammam leitakse praegu, aega sinna jõudmiseks ja rituaali lõpetamiseks ei jätku..."
    n "Kõigile jääks lihtsalt liiga vähe aega."
    protag "Niisiis, arvan, et sel aastal keegi ülikooliga ei liitu."
    drun "Jah... tõesti kahju."
    protag "No, arvatavasti võime pärast seda ikka sõbrad olla."
    drun "Tegelikult... Ainus põhjus, miks ma Eestis olen, on see, et mu vanemad arvasid, et saan sellesse kooli sisse."
    drun "Kui ma ei saa sisse, siis tõenäoliselt kolime tagasi..."
    protag "Oh..."
    protag "Ma lähen."
    drun "Kuhu?"
    protag "Randa. Vaadata päikeseloojangut."
    drun "Okei. Ma jään siia. Mul on veel veidi lootust."
    play music "audio/ost3.mp3" fadein 1.0
    n "Sa kõnnid Drunist eemale ilma hüvasti jätmata."
    scene beach with dissolve
    n "Peagi jõuad randa."
    n "Oled täiesti üksi."
    protag "Päikeseloojang on tõesti ilus."
    protag "Hea viis lõpetada see halb päev."
    protag "Võib-olla see polnudki mõeldud juhtuma."
    protag "Huvitav, kas nii on parem?"
    protag "Saame peagi teada."
    stop music fadeout 1.0
    $ ending_name = "NEUTRAL ENDING - \"True Destiny\""
    jump ending_to_menu


label look_for_drun_instead:
    jump drun_path


label pe_hall:

    scene PE with dissolve
    show pe_teacher_sprite onlayer master
    n "Näed mõningaid tudengeid joostes ja harjutamas, kuid üks inimene paistab silma - kehalise õpetaja."
    play music "audio/ost4.mp3" fadein 1.0
    pe_teacher "Liikuge edasi, laisad!"
    protag "Vabandage—"
    pe_teacher "Hmm? Kes sa oled, noormees? Tee kohe 10 ringi!"
    protag "Mina—"

    menu:
        "Tee 10 ringi":
            $ respect = True
            n "Jooksed 10 ringi kehalise saalis ja oled lõpuks täiesti higine."
            n "Raske hingamine"
            protag "Ma... ma aitan kooli administratsiooni Hammami leidmisel."
            pe_teacher "Haha! Tubli töö! Mida vajad?"
            protag "Kas oled viimasel ajal näinud kedagi keldrisse minemas või kedagi kahtlast?"
            pe_teacher "Hmm... Eile kuulsin keldrist valju häält, aga ei pööranud sellele suurt tähelepanu."
            protag "Kas oled näinud kedagi keldri lähedal?"
            pe_teacher "Olen näinud, et keldri uks on mitu korda sulgunud, kuid ei suutnud tabada, kes sisse läks."
            protag "Kelle arvates võiks see olla?"
            pe_teacher "Ütleksin, et see on see veider laps mu klassist, Aldamur. Kuulsin, et ta joonistas WC-s midagi oma väljaheitega."
            protag "Kas oskad kirjeldada, kuidas ta riides oli?"
            pe_teacher "Tal polnud särki, ainult mustad püksid. Väga veider, ütlen sulle."
            protag "Hm, okei, aitäh abi eest. Kas tead kedagi, kes mind aidata võiks?"
            pe_teacher "Küsi remonttöötajalt, Mr. Burmalda, ta kannab punast ülikonda ja valget lipsu. Ta peaks praegu sööklas olema, nii et kiirusta, kui tahad ta kinni püüda."
            protag "Aitäh!"

        "Jätka":
            protag "Ei! Ma pole selleks siin. Ma olen kooli administratsiooni juures, küsitlen inimesi Hammami juhtumi kohta!"
            pe_teacher "Nii et sa ei kuula minu korraldusi ja nüüd püüad mind küsitleda? Julgustun, noormees."
            pe_teacher "Proovi siis." 
            protag "Kas oled viimasel ajal näinud kedagi keldrisse minemas või kedagi kahtlast?"
            pe_teacher "Hmm... Eile kuulsin keldrist valju häält, aga ei pööranud sellele suurt tähelepanu."
            protag "Kas oled näinud kedagi keldri lähedal?"
            pe_teacher "Olen näinud, et keldri uks on mitu korda sulgunud, kuid ei suutnud tabada, kes sisse läks."
            protag "Kelle arvates võiks see olla?"
            pe_teacher "Ütleksin, et see on see veider laps mu klassist, Aldamur. Kuulsin, et ta joonistas WC-s midagi oma väljaheitega."
            protag "Kas oskad kirjeldada, kuidas ta riides oli?"
            pe_teacher "Tal polnud särki, ainult mustad püksid. Väga veider, ütlen sulle."
            protag "Kas tead kedagi, kes mind aidata saaks?"
            pe_teacher "Küsi remonttöötajalt, Mr. Burmalda, ta kannab punast ülikonda ja valget lipsu. Ta peaks praegu sööklas olema, nii et kiirusta, kui tahad ta kinni püüda."
            protag "Okei, väga tänan."
    stop music fadeout 1.0
    play music "audio/ost1.mp3" fadein 1.0
    scene cafeteria with dissolve
    n "Jooksed sööklasse, et Mr. Burmalda kinni püüda enne, kui ta kuhugi kaob."
    n "Õnneks leiad ta alles siis, kui ta lõpetab söögi."
    n "Otsustad tema kõrvale istuda."
    protag "Tere, kas teie olete Mr. Burmalda?"
    mr_burmalda "Ja teie olete...?"
    protag "Ma olen Protag, aitan Hammami leidmisel. Kas olete viimasel ajal midagi või kedagi kahtlast märganud?"
    mr_burmalda "Las ma mõtlen... Ahjaa! Ma mäletan."
    mr_burmalda "Eile, keldris, kuulsin väga kõvasti müra. Loomulikult läksin uurima, kuid ei leidnud midagi ebatavalist, välja arvatud seljakott roosimustriga."
    mr_burmalda "Arvasin, et keegi oli sisse murdnud, nii et korraldasin koolis otsingu ja kontrollisin kaameraid."
    mr_burmalda "Otsing osutus tulutuks ja keegi oli eile kaamerasilma salvestuse kustutanud."
    protag "Kelle arvates võiks see olla?"
    mr_burmalda "Arvan, et see võib olla see tüüp, Drun, tal oli roosiga ese. See näis väga sarnane seljakotil olnud roosiga. Kuid see võib olla ka lihtsalt kokkusattumus."
    protag "Huvitav... Suur tänu, see aitab väga palju."
    mr_burmalda "Pole tänu väärt, kui vajad veel abi, anna teada."
    protag "O, ja veel üks asi! Kas tead kedagi, kes mind aidata võiks?"
    mr_burmalda "Küsi Mr. Stroy'lt, ta peaks olema arsti kabinetis. Ta leiti hiljuti teadvuseta."
    protag "Tänud veelkord!"

    scene doctors_office with dissolve
    scene mainhall with dissolve
    n "Lähed arsti kabinetti, kus näed meest rahulikult voodis lamamas."
    protag "Tere? Mr. Stroy? Kas olete ärkvel?"
    mr_stroy "..."
    mr_stroy "Oh... Mis?"
    protag "Mr. Stroy!"
    mr_stroy "Ah! Mis? Mida sa tahad?"
    protag "Rahu, ma olen siin ainult, et esitada mõned küsimused."
    mr_stroy "Oh, vabandust. Ma ei mäleta palju sellest, mis juhtus enne siia sattumist, aga püüan parimal moel aidata."
    protag "Räägi, kas oled näinud midagi kahtlast? Eriti Hammami läheduses."
    mr_stroy "Oota, anna mulle üks või kaks minutit. Pean pead selgeks saama."
    n "Ootad paar minutit."
    mr_stroy "Ah.. palju parem. Mis sa küsisidgi?"
    protag "Kas oled näinud midagi kahtlast Hammami lähedal?"
    mr_stroy "Jah! Nii ma siia sattusingi. Ma kontrollisin Hammamit, kui äkki tuli vastu mingi hull, karjudes suvalisi asju, ja ta ajas mind pikali."
    mr_stroy "Pärast seda ärkasin siin."
    protag "Kas mäletad, kuidas ta välja nägi?"
    mr_stroy "Tal oli lühike juukselõikus... arvan. See on kõik, mida mäletan."
    protag "Mõistan. Kas sul on aimu, kes võiks süüdlane olla?"
    mr_stroy "Arvan, et see oli Murino, ta varjab sageli oma lühikest soengut nokaga, nii et ehk arvas ta, et ma ei tea, et see oli tema!"
    protag "Arvan, et olen kogunud piisavalt vihjeid. Aitäh."
    n "Lähed tagasi peasaali, et pea selgeks saada"
    protag "Nii et... minu kogutud vihjete põhjal meeldib süüdlasele roosid, tal on lühike soeng ja ta on kuidagi hullumeelne?"
    protag "Esimene kahtlusalune on Aldamur - vaikne, väga kummaline, eraklik. Tal ei ole lühikest soengut, kuid ta sobib hullumeelse kirjeldusega."
    protag "Teine kahtlusalune on Drun - mu suhteliselt uus sõber, tal on lühike soeng ja riietusel roos, kuid ta ei tundu hull. Võib-olla on ta kõrgefunktsionaalne psühhopaat?"
    protag "Ja viimane, Murino - tal on lühike soeng, aga sellest ma rohkem ei tea."
    protag "Kes on siin tõeline süüdlane... Hm..."

    menu:
        "Aldamur":
            jump false_path

        "Drun":
            jump drun_accuse

        "Murino":
            jump false_path

    return


label false_path:
    scene administration_office with dissolve
    show fogovich_sprite onlayer master
    fogovich "Nii, mu kallis tudeng. Kas sa leidsid süüdlase?"
    protag "Jah, härra. Tuginedes kogutud vihjetele arvan, et see on [accused_suspect]."
    fogovich "Mõistan. Me räägime temaga."
    fogovich "Kuid su ülesanne ei ole veel lõppenud."
    fogovich "Peame välja uurima, kus Hammam asub; meil pole palju aega."
    show mell_sprite at mell_above onlayer overlay
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Härra! Eile tehtud kaamerasalvestus on taastatud."
    hide fogovich_sprite
    show mell_sprite at mell_above onlayer overlay
    mell "Meie leidude järgi lahkus koolist suur veoauto ja sõitis koopasse mitte kaugel siit!"
    fogovich "Huvitav..."
    fogovich "Protag, see on viimane ülesanne, palun uuri koopast."
    protag "M-mida? Täitsa üksi?!?"
    fogovich "Ära muretse, koobas pole tegelikult pime. Pole midagi karta."
    protag "Olgu, usaldan sind."
    fogovich "Hea küll. Soovin sulle edu, Protag."
    fogovich "Väljas ootab sind takso."

    if respect:
        protag "Kas ma peaksin tõesti üksi minema? Võib-olla saan paluda kehalise õpetaja abi, aga mis siis, kui tema saab haiget?"
        menu:
            "Küsi kehalise õpetaja abi":
                jump false_path_help

            "Mine üksi":
                jump false_path_alone

    jump false_path_alone


label false_path_help:
    scene PE with dissolve
    show pe_teacher_sprite onlayer master
    pe_teacher "Vaata, kes siin on! Mis sind täna siia tõi?"
    protag "Arvan, et administratsioon sai teada, kus Hammam on, nii et tahaksin, et sa aitaksid seda leida."
    pe_teacher "Vaja kaitset, eks? Olgu, anna mulle paar minutit, et valmis saada."
    protag "Aitäh! Muide, mis su nimi on?"
    pe_teacher "Võid mind kutsuda Fizruniks."
    n "Paar minuti pärast istute mõlemad taksosse."
    n "Mõlemad jõuate koopasse."
    scene cave with dissolve
    show pe_teacher_sprite at left onlayer master
    pe_teacher "Nad kutsuvad seda koopaks? Siin on nii valge!"
    pe_teacher "Olgu, sa tead, kus see on, eks? Ma järgin su juhtimist."
    n "Jätkate koopas ringi otsimist."
    n "Mõni aeg möödub."
    protag "Oleme nii kaua otsinud, ma ei arva-"
    pe_teacher "Oota! Vaata! Just seal!"
    protag "Ah? Sa oled õigus, Hammam!"
    pe_teacher "Hästi tehtud, tüüp."
    protag "Noh, sina olid see, kes seda märkas."
    pe_teacher "Pole tähtis. Läheme ja anname teada."
    n "Just kui olete lahkumas, hakkate kuulma samme."
    pe_teacher "Hm?"
    protag "Drun?! Mis sa siin teed?"
    pe_teacher "Tunned teda?"
    protag "Jah, ta on mu sõber... arvatavasti."
    show drun at right onlayer master
    play music "audio/ost5.mp3" fadein 1.0
    drun "Ah, sa tõid kehalise õpetaja kaasa? Ma arvasin, et oled üksi."
    drun "See ei muuda midagi."
    protag "Oota, miks sa siin oled?"
    protag "Ära ütle, et sa varastasid Hammami?!"
    drun "Nüüd sa aru said? Pole sa kõige teravam, eks."
    drun "Ja sa tõid selle tüübi kaasa? Hah! Mulle meeldib see rohkem!"
    drun "Viimane-"
    protag "NÜÜD!"
    scene black with dissolve
    n "Kehalise õpetaja, mõistes, mida sa üritad teha, ründab Drunit."
    n "Drun reageerib rünnaku algusele."
    n "Kehalise õpetaja võtab Drunilt kiiresti relva ja nad vahetavad lööke."
    n "Võitlus muutub kiiresti veriseks, paanikas sa ei tea, mida teha."
    n "Drun kasutab võimalust ära ja püüab nuga välja võtta, et võitlus lõplikult lõpetada."
    n "Sa kogud lõpuks end ja võtad lähedalt noa, ja just kui Drun on valmis kehalise õpetaja kaela lõikama..."
    n "khmph"
    n "Sa torkad Drunit südamesse, veri voolab tema suust."
    scene cave with dissolve
    hide drun
    stop music fadeout 1.0
    n "Kehalise õpetaja liigub kiiresti eemale ja te vaatate, kuidas Drun aeglaselt veritseb."
    protag "Drun, miks?"
    drun "\"Hammamit ei saa osta... Sa saad seda vaid uuendada\""
    protag "Mida sa sellest üldse räägid?"
    n "Drunist pole vastust. Tundub, et ta on nüüd soojas paigas."
    pe_teacher "Kurat... see oli... stressirohke."
    protag "Jah... läheme kõigepealt kooli tagasi. Räägime sellest... hiljem."
    n "Juht, mõistes, et te ei saa sellisena kooli tulla, korraldab kohtumise administratsiooniga mujal, kus teid tudengid ei näe."
    n "Mõlemad jõuate kokku lepitud kohta."
    scene administration_office with dissolve
    show fogovich_sprite at right onlayer master
    show pe_teacher_sprite at left onlayer master
    fogovich "Vau... Kas olete mõlemad korras?"
    pe_teacher "Mida sa arvad?"
    fogovich "..."
    fogovich "Mida juhtus?"
    n "Sa ja Fizrun selgitate mõlemad, mis juhtus."
    fogovich "Mõistan... Suurepärane töö Hammami leidmisel, aga Druni kohta... peame selle juhtumi maha vaikima."
    fogovich "Saadan koopasse koristusmeeskonna ja siis saame alustada teiste tudengite vastuvõttu."
    fogovich "Teie härrased minge täna koju. Puhake. Me tasume teid töö eest."
    n "Just kui olete lahkumas, ütleb Mr. Fogovich kõne."
    fogovich "Aitäh teile mõlemale."
    n "Nii, see ongi. Päev on päästetud. Meie poolt."
    n "Ma tapsin oma sõbra... kui ma teda üldse nii võin nimetada."
    n "Kuidas ma pärast seda magan..? Nagu beebi. See tramp sai, mis ta vääris. Ma ei tunne tema suhtes mingit kaastunnet."
    n "Hea, et ta läks!"
    $ ending_name = "GOOD ENDING - Blood And Sweat"
    jump ending_to_menu


label false_path_alone:
    scene cave with dissolve
    n "Lähed välja ja istud taksosse."
    n "Jõuate koopasse."
    protag "Olgu... kogu end kokku."
    protag "Hmm, tundub, et tal oli õigus. Siin pole isegi taskulampi vaja."
    n "Jätkad koopas ringi uurimist."
    n "Mõne aja pärast otsustad tagasi pöörduda, kui järsku..."
    protag "Hammam..!"
    protag "Ma pean-"
    n "Kuulevad samme selja tagant, mis lähenevad üha lähemale."
    n "Sinu süda tardub, tunned nagu ei suudaks liikuda."
    protag "(Kes see olla võiks..?)"
    show drun onlayer master
    play music "audio/ost5.mp3" fadein 1.0
    drun "Noh, noh, noh. Tundub, et selle leidsidki."
    protag "D-Drun?! Sa varastasid Hammami?!?"
    drun "Sa lõpuks jõudsid arusaamisele, sõber. Aga siin lõpeb sinu teekond."
    protag "Miks sa Hammami varastasid??"
    drun "Üks tark mees ütles kord — 'Hammamit ei saa osta, seda saab vaid uuendada'."
    drun "Arvasin, et ta naljatas, aga tal oli õigus. Ma ei suutnud Hammamit leida ega osta. See oli võimatu."
    drun "Kuni ma selle ülikooli avastasin. Ja just see Hammam on... väga eriline."
    protag "Mida sa sellega mõtled?"
    drun "See ei loe enam. Mitte sinu jaoks, vähemalt."
    drun "Kui nad märkavad, et sind ei ole, on vastuvõtt juba möödas ja mina kaon."
    drun "Seega, viimane sõna?"

    menu:
        "Proovi põgeneda":
            protag "(Kuradi..!)"
            n "Võtsid lähedalt kivi ja viskasid selle Druni näkku, püüdes põgeneda."
            n "Just kui arvad, et suudad temast mööda saada, kuuled nõrka heli."
            stop music fadeout 1.0
            n "shlik"
            n "thump"
            n "Maailm hakkab aeglaselt pimenema."
            n "Tunned, kuidas pimedus sind vallutab."
            n "See on lõpp."
            n "Oled läbi kukkunud, kuid see ei huvita sind enam."
            $ ending_name = "BAD ENDING - \"The Fool\""
            jump ending_to_menu

        "Mine Hammami":
            n "Võtsid kivi ja viskasid selle kiiresti Druni näkku, jooksid Hammami sisse ja lukustasid ennast."
            scene hammam with dissolve
            drun "Ahahaha, tõsiselt? Sul oli nii palju valikuid ja sa valisid... selle?"
            drun "Lihtsalt tule välja ja lõpeta määrimise edasi lükkamine."
            n "..."
            n "...."
            n "....."
            drun "Olgu, palun ava juba uks. Tõsiselt."
            n "..."
            drun "Hea küll, viskan relvad minema, aga palun lahku. Palun!"
            drun "No dude... sa ei saa mulle seda teha! ####!"
            drun "Plaan oli täiuslik! Kurat!"
            stop music fadeout 1.0
            n "Kui Drun nutab ja palub sul ust avada, märkad, et Hammam kuumeneb üha enam."
            n "Peagi muutub Druni hääl summutatuks ja kaob täielikult."
            n "Otsustad vaadata väikese akna kaudu ja märkad..."
            n "Koobas, kus viibisid, on kadunud."
            protag "Huh? Kuhu koobas kadus?"
            n "Otsustad ukse avada."
            protag "Seal pole midagi... Kõik on tühi ja valge."
            n "Just kui astud sammu, hakkab su pea valutama, nagu see hakkaks lõhkema."
            protag "AGHHHHH!!!"
            n "Valu lõpuks lakkab, kuid kohe, kui silmad liduled..."
            scene Solid("#000") with dissolve
            show currilicum_image at truecenter
            protag "Kas see polnud september? Miks siin lund on?"
            protag "...?"
            protag "Veel üks õppekava?"
            $ ending_name = "SECRET ENDING - \"The REAL Good Ending\""
            jump ending_to_menu


label drun_accuse:
    protag "Arvan, et see on Drun. Jah, ta on mu sõber, kuid sobib kirjeldusse liiga hästi."
    protag "Pean sellest teatama."
    scene administration_office with dissolve
    show fogovich_sprite onlayer master
    fogovich "Nii, mu kallis tudeng. Kas sa leidsid süüdlase?"
    protag "Jah, härra. Tuginedes kogutud vihjetele arvan, et see on Drun."
    fogovich "Mõistan. Me räägime temaga."
    fogovich "Kuid su ülesanne pole veel lõppenud."
    fogovich "Peame välja uurima, kus Hammam asub; meil pole palju aega."
    mell "Härra! Eile tehtud kaamerasalvestus on taastatud."
    mell "Meie leidude järgi lahkus koolist suur veoauto ja sõitis koopasse mitte kaugel siit!"
    fogovich "Interesting..."
    fogovich "Protag, see on viimane asi, mida ma palun — uuri koopast."
    protag "M-mida? Täitsa üksi?!?"
    fogovich "Ära muretse, koobas pole tõesti pime. Pole midagi karta."
    protag "Olgu... ma usaldan sind."
    fogovich "Hea küll. Soovin edu, Protag."
    fogovich "Väljas ootab sind takso."
    scene cave with dissolve
    n "Lähed välja ja istud taksosse."
    n "Sa jõuad koopasse."
    protag "Olgu... kogu end kokku."
    protag "Hmm, tundub, et tal oli õigus. Siin ei ole taskulampi vaja."
    protag "Jätkad koopas ringi uurimist."
    n "Mõne aja pärast otsustad tagasi pöörduda, kui järsku..."
    stop music fadeout 1.0
    protag "Ei saa olla... See on tõesti siin. Hammam!"
    protag "Vau, see on nii... ilus!"
    protag "Pean sellest tagasi teatama."
    protag "...Või ehk peaksin sinna ise minema? Aga siis ei jätku mul aega!"

    menu:
        "Teata tagasi":
            jump report_back

        "Jää natukeseks":
            jump the_hammam

    return


label report_back:
    protag "Pole selleks aega, aeg tagasi minna."
    scene administration_office with dissolve
    show fogovich_sprite onlayer master
    n "Hüppad kiiresti taksosse ja ruttad administratsiooni kontorisse."
    play music "audio/beginning.mp3" fadein 1.0
    fogovich "Olete tagasi, kas leidsid selle?"
    protag "Jah, see on koopas sügaval."
    fogovich "Väga tubli, Protag. Sul oli õigus Druni kohta, ta tunnistas seda, aga ei öelnud meile asukohta."
    fogovich "Tänan teid... Ma ei suuda sõnadesse panna, kui tänulik ma olen. Ainuüksi teie tõttu saavad siin inimesed alustada õpinguid."
    fogovich "Homme korraldame pidustuse. Loodetavasti on peategelane kohal."
    protag "Hahaa... aitäh, aga te ei peaks selle nimel vaeva nägema."
    protag "Aga tõsiselt, peame vastuvõtud alustama! Aega pole palju."
    fogovich "Ah, jah, vabandust. Teen teadaande. Sa oled järjekorras esimene."
    n "Noh, see on tehtud. Päev on päästetud, minu poolt muidugi."
    n "Nüüd saan lõpuks üliõpilaseks... ja veelgi tähtsam — kogeda seda Hammamit."
    stop music fadeout 1.0
    $ ending_name = "GOOD ENDING - \"Detective L\""
    jump ending_to_menu


label the_hammam:
    n "Otsustad jääda natukeseks."
    scene hammam with dissolve
    n "Sisened Hammami ja lülitad sooja sisse."
    play music "audio/ost3.mp3" fadein 1.0
    protag "Ah... Hea tunne. Pole mitu kuud nii lõdvestunud olnud."
    protag "Mm....."
    n "Hakkad aja jälgimisest ilma jääma."
    n "Sinu keha ei taha sellest mugavusest loobuda... miks siis lahkuda?"
    protag "(haigutan)"
    protag "Võtan siin kiiresti uinaku."
    protag "Zzz..."
    n "Mõne teadmata aja pärast möödub."
    protag "..Hm? Kurat! Ma magasin sisse. Pean kiiresti ülikooli tagasi minema!"
    n "Vaatad väikese akna kaudu välja."
    stop music fadeout 1.0
    protag "Mis?! Kuhu koobas kadus? Kus ma praegu olen?! Mis toimub??"
    n "Avad ukse."
    protag "Seal pole midagi..!!! Kõik on tühi ja valge!"
    n "Just kui astud sammu, hakkab su pea valutama, nagu see plahvataks."
    protag "AGHHHHH!!!"
    n "Valu lõpuks lõpeb, aga kohe, kui pilgutad..."
    scene Solid("#000") with dissolve
    show currilicum_image at truecenter
    protag "Kus ma nüüd olen..?"
    protag "Hm?"
    protag "Veel üks õppekava?"
    jump ending_to_menu


label ending_to_menu:
    stop music fadeout 1.0
    scene black with dissolve
    $ unlock_ending(ending_name)
    $ renpy.music.set_volume(1.5, channel="sound")
    play sound "audio/ending.mp3"
    n "[ending_name]"
    pause 3.0
    $ renpy.music.set_volume(1.0, channel="sound")
    $ renpy.full_restart()
