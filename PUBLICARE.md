# Publicarea cercetării pe Business Intelligence

Site-ul este publicat din `main` al repository-ului `arinm/business` prin GitHub Pages. Acest document este contractul comun al taskurilor programate.

## Rubrici și nume de fișiere

| Flux | Cale pentru ediții noi | Index |
| --- | --- | --- |
| Lovitura, ediții editoriale existente | `briefings/YYYY-MM-DD.html` | `lovitura/index.html`, `calendar.html`, `index.html` |
| Investment Committee / Business Ideas Review | `radar/investment-committee-YYYY-MM-DD.html` | `radar/index.html` → `feed:investment-committee` |
| Business Opportunity Radar | `radar/oportunitati-YYYY-MM-DD.html` | `radar/index.html` → `feed:oportunitati` |
| SICAP Tech | `radar/sicap-YYYY-MM-DD.html` | `radar/index.html` → `feed:sicap` |
| Surse AI și oportunități | `radar/surse-ai-YYYY-MM-DD.html` | `radar/index.html` → `feed:surse-ai` |
| Nișe deep-tech | `radar/nise-deep-tech-YYYY-MM-DD.html` | `radar/index.html` → `feed:nise-deep-tech` |

Edițiile ChatGPT deja publicate rămân la `briefings/chatgptANALIZA-YYYY-MM-DD.html` și sunt listate în Radar Business. Arhivele nu se mută; toate URL-urile vechi rămân valide. Pentru același flux și aceeași dată folosește `-v2`, `-v3`, etc.; nu suprascrie un raport existent. Nu atribui altui flux o ediție proprie.

## Pașii fiecărei rulări

1. Citește cel mai recent `main`, ultimele ediții din fluxul respectiv și documentele de cercetare relevante. Verifică sursele primare și diferențele față de runda trecută. Păstrează cerințele de conținut ale taskului original.
2. Scrie raportul în română, HTML cu `<link rel="stylesheet" href="../styles.css">`, surse direct accesibile, dată și rubrică. Publică numai informații potrivite pentru un site public; nu include date sau documente confidențiale.
3. Adaugă un card nou cu titlu, dată, rezumat și link relativ de forma `../radar/FILENAME.html` imediat după markerul `<!-- feed:FLUX -->` din `radar/index.html`. Păstrează celelalte fluxuri și toate cardurile existente.
4. Pentru orice idee din portofoliu menționată sau reevaluată, păstrează pagina proprie `portfolio/SLUG/index.html` cu istoricul și linkurile către rapoartele relevante; actualizează rândul ei în `portfolio/index.html`. La apariția unei idei noi, adaugă pagina și intrarea în `portfolio/ideas.json`, apoi include-o în căutare. Căutarea preia automat cardurile noi din `index.html` și `radar/index.html`; fiecare card trebuie să aibă titlu descriptiv și rezumat. `search/reports.json` păstrează intrările istorice care nu apar în aceste două liste. Nu schimba retroactiv evaluările datate fără un motiv explicat.
5. Actualizează `index.html` doar în zona introductivă cu un link către cea mai recentă ediție Radar, după caz. Pentru Investment Committee, actualizează `portfolio/index.html` cu scoruri datate, dovezi și schimbările față de evaluarea precedentă. Nu modifica clasamentul dacă dovezile nu s-au schimbat.
6. Recitește `main` imediat înainte de commit/push. Integrează orice modificare intervenită de la alți agenți, fără reset/force-push și fără rescrierea fișierelor lor. Dacă apare conflict, reia de la noul `main` și aplică numai diferența proprie.
7. Verifică commitul pe `main`, rularea deploy-ului GitHub Pages și URL-ul paginii noi. În notificarea scurtă către utilizator include URL-ul și 1–3 concluzii; dacă un pas eșuează, spune explicit ce s-a publicat și ce nu. Conversația nu este arhiva raportului.

Taskurile nu trebuie repornite sau redenumite pentru a folosi aceste reguli. Păstrează frecvența și conținutul fiecărui flux.
