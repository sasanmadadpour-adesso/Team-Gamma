# Community-App Einspeisung - Producer Onboarding / Energy Sharing MVP



## 1. Goal



Implement and refine the "Community-App Einspeisung" for an Anlagenbetreiber

in an Energy-Sharing system.



The implementation focuses on:



\- the operator-facing Einspeisung dashboard

\- Producer / Einspeiseanlage context

\- Aktion 4: "Einspeiseanlage anmelden"

\- correct integration boundaries toward BTP, S/4HANA Utilities and market partners

\- preparation for Aktion 2: "Einspeiseanlage zuordnen"

\- understandable visualization of generation, Community usage, surplus and

&#x20; simplified revenue



The application must fit into the complete Energy-Sharing process.



Do NOT treat this as an isolated plant CRUD application.



The user should understand at a glance:



1\. Which Community am I in?

2\. Which Anlagenbetreiber / plant is involved?

3\. Which grid and Bilanzkreis context applies?

4\. Which metering context applies?

5\. What is the plant producing today?

6\. How much is used by the Community?

7\. How much surplus remains?

8\. What simplified revenue does this create?

9\. What is the current onboarding / registration state?





# 2. Existing System Context



Assume that the preceding Energy-Sharing context already exists.



The Einspeisung application consumes this context instead of recreating it.



Existing upstream information may include:



\- Community

\- Community status

\- Gebiet

\- Bilanzierungsgebiet

\- Ansprechpartner

\- Konditionen

\- AufteilungsschlÃ¼ssel

\- Entgelt

\- Laufzeit

\- Dienstleister / Lieferant

\- Bilanzkreis / BK-ID

\- Anlagenbetreiber / Producer master data

\- Einspeiseanlage master data

\- participant / Community context

\- MaLo

\- MeLo

\- iMSys

\- Messstellenbetreiber



Reuse existing data whenever available.



Do NOT ask the Anlagenbetreiber to manually re-enter information that is

already available in producer, Community, BTP, S/4 or metering master data.





# 3. Overall Energy-Sharing Model



Energy Sharing uses the public distribution grid.



Energy is not physically routed directly from one participant to another.



Instead:



\- the plant feeds electricity into the public grid

\- participants consume electricity through the public grid

\- generation and consumption are measured

\- shared electricity is allocated computationally

\- allocation occurs in 15-minute intervals

\- the supplier / Dienstleister handles quantities in the Bilanzkreis

\- residual electricity for participants is supplied where required



Each participating Marktlokation belongs to exactly one Bilanzkreis.



The VNB / Messstellenbetreiber supplies the relevant metering information

and normal grid usage remains applicable.





# 4. Important Terminology



Do NOT confuse "Ãœberschuss" and "Reststrom".



## Ãœberschuss



Producer-side electricity remaining after Community allocation.



Example:



Erzeugung = 42.8 kWh

Community-Nutzung = 31.6 kWh



Ãœberschuss = 11.2 kWh



This surplus can conceptually continue toward downstream marketing /

Direktvermarktung.



## Reststrom



Additional electricity required by participants when their allocated

Energy-Sharing quantity does not cover their consumption.



Reststrom primarily belongs to the participant / supply side.



Do NOT use "Reststrom" as another word for producer surplus.





# 5. MVP Scope



For the MVP, optimize the presentation around:



\- one active Community

\- one primary / currently relevant Einspeiseanlage



This is a presentation simplification only.



Do NOT encode a permanent business rule that a Community may only contain

one plant.



The underlying Energy-Sharing process supports additional Einspeiseanlagen.





# 6. Existing Community Context - Aktion 1



Aktion 1 "Community bilden" already exists conceptually and must NOT be

reimplemented in this application.



The broader process contains:



\- Community name

\- Gebiet

\- Ansprechpartner

\- SchlÃ¼ssel-Typ

\- Entgelt

\- Laufzeit

\- BTP persistence

\- Community status

\- activation

\- visibility in Bezug and Einspeisung apps



A Community can only be activated once the required plant assignment exists.



The Einspeisung application consumes this Community context.



Example MVP display:



Community Sonnenviertel

Aktiv



Show the Community status only once.



Avoid duplicate "Aktiv" labels throughout the dashboard.





# 7. Community / Participant Context



Participants are onboarded through the separate Bezug / Aktion-3 process.



The Einspeisung application must NOT implement participant onboarding.



However, participant context is useful for the Anlagenbetreiber.



The dashboard may therefore display aggregated information such as:



\- number of participants

\- aggregated Community consumption

\- Community usage of generated electricity



Example:



Teilnehmer

24 Teilnehmer



This is informational context only.



Do not add participant management CRUD to this application.





# 8. Netz \& Bilanzierung



Show the relevant grid and balancing context together.



Example MVP data:



Netz \& Bilanzierung



Bilanzierungsgebiet

Dortmund Netzgebiet 01



Bilanzkreis

11X-DEMO-ENERGY-1



Use meaningful identifiers instead of generic text such as:



"Bilanzkreis: zugeordnet"



The Bilanzkreis displayed here is existing upstream context.



The broader architecture allows a Community to use an existing Bilanzkreis

or establish/use a new Bilanzkreis.



Bilanzkreis creation / selection itself is outside the implementation scope

of this UI.



The Einspeisung app consumes the resulting BK-ID/context.





# 9. Geographic Eligibility



The Gebiet check represents the geographic Energy-Sharing eligibility rule.



According to the supplied process material:



\- Energy Sharing takes place within the relevant Bilanzierungsgebiet

\- from 01.06.2028 the model may also include an adjacent Gebiet within the

&#x20; same Regelzone



Do not hard-code the simplified MVP geography in a way that prevents this

rule from being changed later.



For the MVP the eligibility result may be simulated using centralized

prototype data.





# 10. Messung



Do not invent a generic "iMSys number".



Show meaningful metering context.



Example:



Messung



Messlokation

DE000562668020000000000000000001



Messsystem

iMSys



Messstellenbetreiber

Westnetz GmbH



When real integrated data is available, use:



\- MeLo-ID

\- Messsystem

\- Messstellenbetreiber / market-partner identifier



For the MVP these may be explicit demo values.



Display one concise note such as:



"Demodaten fÃ¼r MVP"



Do NOT repeat "Prototyp:" before every individual value.





# 11. Primary Plant Card



Use the heading:



"Meine Einspeiseanlage"



instead of presenting the MVP primarily as a multi-plant asset management

portal.



Display relevant plant information such as:



\- Einspeise-MaLo

\- EE-Art

\- Leistung

\- onboarding / assignment status



Where existing producer/master data provides it, the primary plant card may

also display:



\- plant/display name

\- address or location

\- Anlagenbetreiber



These are presentation fields.



Do NOT require the user to enter these fields again when they already exist

in producer/master data.



Keep one clear status badge.



Do NOT display the same plant status twice.





# 12. Status Semantics



Status wording must accurately represent the process.



Important distinction:



"Bereit zur Zuordnung"



means:



Aktion 4 completed successfully.

The plant is registered and ready for Aktion 2.



It does NOT mean that the plant is already assigned to the Community.



"Teil der Community"



belongs only after successful Aktion 2.



Do not replace "Bereit zur Zuordnung" with "Aktiv" or

"Teil der Community" prematurely.





# 13. Aktion 4 - Einspeiseanlage anmelden



Implement the complete user-facing Aktion-4 flow.





## 13.1 Step 4.1 - Anlage anmelden



Allow the Anlagenbetreiber to initiate registration.



Required registration information:



\- Einspeise-MaLo

\- Leistung

\- EE-Art



For the MVP:



EE-Art:

\- Solar

\- Wind



Validation:



\- Einspeise-MaLo required

\- Leistung required

\- Leistung > 0

\- EE-Art required



Provide a clear summary before continuing.



Allow editing before submission.





# 14. Anlage prÃ¼fen



After registration data is entered, perform the required eligibility checks.



The process requires checking:



1\. EE-Anlage

2\. Gebiet

3\. iMSys



Show these checks clearly in the UI.



Example:



âœ“ Erneuerbare-Energien-Anlage

âœ“ Gebiet zulÃ¤ssig

âœ“ iMSys vorhanden



Do not make these arbitrary frontend-only business rules.



Their intended data provenance is:



EE-Anlage

â†’ producer / plant master data, e.g. production type



Gebiet

â†’ Community context + S/4 Netz-/Bilanzierungsgebiet



iMSys

â†’ S/4 / metering context



For the MVP these checks may use centralized demo/mock data.



They must be structured so they can later be replaced by integration calls.





# 15. Business / Legal Rules



Reflect the supplied process rules:



\- only renewable-energy plants

\- operation must not be predominantly commercial according to the supplied

&#x20; Â§42c EnWG process context

\- Einspeisung is fully balanced

\- Direktvermarktung is possible



These rules should influence eligibility/status where appropriate.



Do not build a full legal compliance engine.





# 16. S1 - Stammdaten lesen



Represent S1 as an integration boundary.



Direction:



S/4HANA Utilities â†’ BTP



Relevant data includes:



\- Netzgebiet

\- Bilanzierungsgebiet

\- MaLo

\- Messlokation

\- iMSys



S1 supplies authoritative master-data context required by the onboarding

process.



For the MVP, simulate the result.



Do NOT implement fake S/4HANA internals.





# 17. Step 4.2 - Ãœbernahme bestÃ¤tigen



After successful eligibility checks, represent the Dienstleister /

Lieferant step:



"Ãœbernahme bestÃ¤tigen"



Meaning:



the Einspeisung is to be taken into the relevant Bilanzkreis.



This should be a distinct process step.



Do not silently skip it.





# 18. S2 - MaKo-Prozess auslÃ¶sen



Represent S2 as an outbound integration boundary.



Direction:



BTP â†’ S/4HANA Utilities



Purpose for Aktion 4:



trigger the assignment of the Einspeise-MaLo using the relevant BK-ID.



Conceptually S/4HANA then handles the appropriate market communication,

including UTILMD toward the VNB.



The frontend must NOT simulate internal UTILMD processing or pretend to be

the VNB.



For the prototype it is acceptable to expose a temporary external-result

boundary.





# 19. External Market Result



The MVP may provide explicit prototype controls such as:



\- "BestÃ¤tigung erhalten"

\- "Ablehnung erhalten"



These represent an incoming external result.



They must NOT be presented as the frontend performing the actual VNB or

S/4 process.



This boundary exists only so the complete Aktion-4 state flow can be

demonstrated before real team integration.





# 20. S3 - Prozessstatus



Represent S3 as the incoming status boundary.



Direction:



S/4HANA Utilities â†’ BTP



Possible results:



\- confirmation

\- rejection

\- rejection reason



A rejection must remain visible and understandable to the user.



Technical failures and business rejection are different states.



Example:



Business rejection:

"Zuordnung durch Marktpartner abgelehnt."



Technical failure:

"Status konnte aktuell nicht geladen werden."



Do not treat these as the same error.





# 21. Step 4.3 - Antwort verarbeiten



When confirmation arrives:



\- process the positive result

\- release the plant

\- persist it

\- set status to "Bereit zur Zuordnung"



When rejection arrives:



\- show rejection

\- show reason where available

\- do not persist the plant as successfully registered





# 22. Persistence



The target architecture persists Community/participation/plant relationships

in BTP-side persistence rather than creating these as SAP master data.



For the current prototype, localStorage may be used as a temporary

persistence abstraction.



Requirements:



\- successful plants survive page reload

\- deduplicate by Einspeise-MaLo

\- rejected registrations are not stored as successful plants

\- centralize persistence logic

\- make future replacement by a BTP backend straightforward



Do not scatter localStorage calls throughout the UI.





# 23. Step 4.4 - Info an Betreiber



After successful registration show a clear result:



"Anlage ist angemeldet"



and:



"Bereit zur Zuordnung"



Do not claim:



"Anlage ist Teil der Community"



because that belongs to Aktion 2.





# 24. Handoff to Aktion 2



Aktion 2 is the next process.



Do NOT fully implement it here.



The application should expose a clean conceptual handoff:



Aktion 4

â†’ Anlage angemeldet

â†’ Bereit zur Zuordnung

â†’ Aktion 2



Aktion 2 later performs:



\- selection of a registered plant

\- Gebiet check

\- Bilanzkreis check

\- iMSys check

\- assignment with validity date

\- BTP persistence of the assignment

\- virtual ZP relationship

\- S4 formula adjustment in EDM

\- operator notification



Only after successful Aktion 2 may the plant state become:



"Teil der Community"





# 25. S4 - Formeln



S4 belongs primarily to the Community assignment / calculation flow.



Conceptually it adjusts the relevant EDM formulas when the plant is assigned

to the Community.



Do NOT implement S/4 EDM formula calculation in this frontend.



Preserve S4 as an integration boundary.





# 26. S5 - Mess- und Profilwerte



The operational dashboard must be designed so its real energy values can

later be supplied through S5.



Direction:



S/4HANA Utilities â†’ BTP



Relevant values include:



\- Â¼-h measurement values

\- profile values

\- Community share / Anteil

\- Reststrom where applicable



These values support:



\- applications

\- prognosis

\- MaBiS checks

\- billing



For this Einspeisung dashboard, relevant visualizations may consume data

derived from this source for:



\- Tagesverlauf

\- Erzeugung

\- Community-Nutzung

\- Ãœberschuss



For the MVP, use centralized demo data.



Do NOT imply that the frontend calculates authoritative metering,

allocation, balancing or settlement quantities itself.





# 27. S6 - Bilanzkreis hinterlegen



Use the newer overall target architecture:



S6 = Bilanzkreis hinterlegen.



Conceptually:



Lumenaza â†’ S/4HANA



The BK-ID for the Community is supplied so UTILMD registration and

Einspeise-MaLo assignment use the correct Bilanzkreis.



This is upstream/integration context.



Do NOT implement Bilanzkreis creation or S6 internals in this UI.





# 28. Architecture Version Priority



The supplied material contains an older detailed sub-process representation

where S6 appears as billing data for the app.



The newer overall architecture supersedes this interpretation.



For this implementation use:



S6 = Bilanzkreis hinterlegen.



Billing / Abrechnung belongs to the newer Lumenaza-oriented target

architecture.



Do not implement the older S6-as-billing-data interpretation.





# 29. Tagesverlauf



Place the daily energy visualization prominently next to the plant card.



Desktop layout:



approximately



35% plant information

65% chart



On smaller screens stack responsively.



Use a smooth SVG chart without adding a chart framework if the current

project does not require one.



Show two main smooth series:



1\. Erzeugung der Anlage

2\. Community-Verbrauch



The generation profile for a solar plant should behave plausibly:



\- near zero during night

\- rises in the morning

\- midday peak

\- falls toward evening



Community consumption should have a different shape, for example:



\- morning activity

\- daytime baseline

\- moderate evening increase



Do not make the consumption curve visually resemble a second solar curve.



Axes:



X:

00:00 â†’ 24:00



Y:

kWh



Prepare the underlying data model for 15-minute granularity.



The visual SVG path may be smoothed for readability.



Clearly mark the current values as:



"Demodaten fÃ¼r MVP"



Do not imply that generated prototype values are live measurements.





# 30. Energy Flow / Allocation Summary



Under the graph provide a compact operational summary.



Example:



Erzeugung heute

42.8 kWh



Community-Nutzung

31.6 kWh



Ãœberschuss

11.2 kWh



Nutzungsquote

73.8 %



Conceptually:



communityUsed = min(generation, eligibleCommunityDemand)



surplus = max(generation - communityUsed, 0)



usageRate =

communityUsed / generation

when generation > 0



For the MVP these may be derived from demo data.



This is a visualization / explanation model, not an authoritative balancing

engine.





# 31. Surplus Logic



Represent the high-level business logic clearly:



Erzeugung

â†“

Community-Nutzung

â†“

Ãœberschuss?

â”œâ”€â”€ Nein â†’ vollstÃ¤ndig innerhalb der Community genutzt

â””â”€â”€ Ja   â†’ Direktvermarktung / downstream market process



Do NOT implement a complex electricity trading engine.



The goal is simply to make the business meaning of excess production

visible to the Anlagenbetreiber.





# 32. Direktvermarktung / Lumenaza / BKV



The "Ãœberschuss â†’ Direktvermarktung" representation is an operator-facing

visualization of a downstream business result.



According to the target architecture, responsibilities such as:



\- Community prognosis

\- Fahrplan

\- trading of Rest- und Ãœberschussmengen

\- MaBiS

\- balancing results



belong to Lumenaza and/or the responsible BKV depending on the selected

Bilanzkreis model.



The Community-App Einspeisung must NOT implement these processes.



It consumes or visualizes relevant results when available.



For the MVP:



Ãœberschuss

â†’ Direktvermarktung



may be represented using centralized demo data.





# 33. Pricing



Show simple pricing context underneath the energy graph / summary.



Use two clearly distinguished prices.



Example:



Community-VergÃ¼tung

0.14 â‚¬/kWh



Direktvermarktung

0.08 â‚¬/kWh



Meaning:



Community-VergÃ¼tung

= simplified price/value attributed to electricity used within the

&#x20; Community.



Direktvermarktung

= simplified market/remuneration value used for surplus electricity sent

&#x20; to the downstream marketing path.



Do NOT build:



\- dynamic market-price APIs

\- trading algorithms

\- tariff engines

\- settlement engines



unless explicitly required by later integration.





# 34. Simplified Revenue



Calculate an understandable MVP operator-facing revenue representation.



Example:



Community-Nutzung:

31.6 kWh Ã— 0.14 â‚¬/kWh

= 4.42 â‚¬



Direktvermarktung:

11.2 kWh Ã— 0.08 â‚¬/kWh

= 0.90 â‚¬



ErlÃ¶s heute:

5.32 â‚¬



Use consistent rounding and units.



Centralize the price assumptions so they can later be replaced by

integrated commercial data.





# 35. Revenue Disclaimer



"ErlÃ¶s heute" is a simplified MVP visualization.



It is NOT:



\- complete settlement

\- an invoice

\- accounting profit

\- net income

\- authoritative market settlement



Do not silently calculate or subtract:



\- Netzentgelte

\- Umlagen

\- Abgaben

\- taxes

\- balancing costs

\- service fees



unless authoritative integrated data exists.



The Energy-Sharing process still operates through the public grid and

normal grid-related charges remain relevant.



Never label the simplified value as "Gewinn".





# 36. Revenue / Surplus UI



Use the otherwise-empty area below the graph for a compact section such as:



"Verteilung \& ErlÃ¶s heute"



Suggested content:



Erzeugung

42.8 kWh



Community-Nutzung

31.6 kWh



Ãœberschuss

11.2 kWh



Nutzungsquote

73.8 %



Community-VergÃ¼tung

0.14 â‚¬/kWh



Direktvermarktung

0.08 â‚¬/kWh



Community-ErlÃ¶s

4.42 â‚¬



Direktvermarktungs-ErlÃ¶s

0.90 â‚¬



ErlÃ¶s heute

5.32 â‚¬



Optionally show a small state indicator:



"Ãœberschussvermarktung: Aktiv"



Keep this compact.



Do not turn the dashboard into a financial trading terminal.





# 37. Demo Data



Centralize all MVP/demo context.



Example conceptual structure:



prototypeContext = {

&#x20; community,

&#x20; operator,

&#x20; participation,

&#x20; grid,

&#x20; balancing,

&#x20; metering,

&#x20; prices,

&#x20; energySeries

}



Example values may include:



Community:

Sonnenviertel



Status:

Aktiv



Teilnehmer:

24



Bilanzierungsgebiet:

Dortmund Netzgebiet 01



Bilanzkreis:

11X-DEMO-ENERGY-1



Messlokation:

DE000562668020000000000000000001



Messsystem:

iMSys



Messstellenbetreiber:

Westnetz GmbH



Community-VergÃ¼tung:

0.14 â‚¬/kWh



Direktvermarktung:

0.08 â‚¬/kWh



These are MVP demo values.



Do not spread magic constants throughout rendering logic.





# 38. Existing Producer Data



Where producer onboarding/master data already exists, consume it.



Possible existing fields include:



\- first name

\- last name

\- business information

\- address

\- postcode

\- city

\- production type

\- plant capacity

\- market location identifier

\- building ID

\- contract/customer references



Use existing information instead of requesting it again.



The user-facing registration should remain focused on information actually

needed for Aktion 4.





# 39. Existing Participant / Metering Data



Existing participant/metering datasets may contain information such as:



\- building ID

\- participant role

\- MeLo

\- Import-MaLo

\- Export-MaLo

\- metering operator

\- metering system



Use such information as contextual/integration data where relevant.



Do NOT merge participant onboarding functionality into the Einspeisung

application.





# 40. UI Principles



The dashboard should feel like one coherent Energy-Sharing product.



Prioritize:



1\. Community context

2\. operator / plant context

3\. grid / Bilanzkreis context

4\. metering context

5\. registration status

6\. energy behavior

7\. distribution / surplus

8\. simplified revenue



Avoid:



\- duplicate statuses

\- unnecessary KPI rows

\- excessive cards

\- repeated demo warnings

\- fake backend detail

\- technical integration jargon dominating the main UI



The user should understand the dashboard without understanding SAP

architecture.





# 41. Architecture Separation



Keep clear boundaries between:



\- UI rendering

\- business-state logic

\- persistence

\- demo data

\- integration adapters



Do not tightly couple UI elements directly to:



\- localStorage

\- S/4 assumptions

\- VNB assumptions

\- demo time-series generation

\- pricing constants



Design these as replaceable boundaries.





# 42. Do Not Fake External Systems



Do NOT implement fake internals for:



\- S/4HANA Utilities

\- VNB

\- MSB

\- ÃœNB

\- BIKO

\- Lumenaza

\- BKV

\- EDIFACT / UTILMD

\- MaBiS

\- Fahrplan

\- trading



Represent only the required inputs, outputs and integration boundaries.



Other teams / systems may later supply these components.





# 43. Preserve Existing Prototype Functionality



Do not regress existing working functionality.



Preserve:



\- overview/dashboard

\- Neue Anlage anmelden

\- registration form

\- required-field validation

\- positive Leistung validation

\- summary

\- edit before continuation

\- EE eligibility check

\- Gebiet eligibility check

\- iMSys check

\- takeover confirmation

\- external confirmation

\- external rejection

\- rejection reason

\- success state

\- "Bereit zur Zuordnung"

\- persistence after refresh

\- MaLo deduplication

\- rejection not persisted

\- current responsive design

\- current SVG chart



Reuse the existing project structure.



Do not introduce a new framework or unnecessary dependency.





# 44. Error Handling



Differentiate:



Validation errors

â†’ incorrect/missing user input



Business rejection

â†’ eligibility or market-process rejection



Integration error

â†’ external system unavailable / failed request



Persistence error

â†’ state could not be stored



These should not all appear as the same generic error.





# 45. Accessibility / UX



Maintain:



\- readable labels

\- visible status indicators

\- keyboard-accessible controls

\- appropriate button states

\- clear success/error feedback

\- responsive layout

\- understandable units

\- sufficient visual hierarchy



Do not rely only on color to communicate important status.





# 46. Definition of Done



The implementation is complete when:



1\. Community context is clearly visible.



2\. "Aktiv" is not duplicated unnecessarily.



3\. Anlagenbetreiber / primary plant context is visible.



4\. Participant count/context is visible without implementing participant

&#x20;  management.



5\. Bilanzierungsgebiet and Bilanzkreis are grouped together.



6\. Metering context displays MeLo, iMSys and Messstellenbetreiber.



7\. Demo data is clearly marked once.



8\. The plant registration form accepts Einspeise-MaLo, Leistung and EE-Art.



9\. Invalid registration input is blocked.



10\. EE-Anlage, Gebiet and iMSys checks are represented.



11\. The takeover/Bilanzkreis step is represented.



12\. S1, S2 and S3 have clean replaceable integration boundaries.



13\. Positive external confirmation results in successful registration.



14\. Rejection remains visible and does not become a successful plant.



15\. Successful state is "Bereit zur Zuordnung".



16\. "Teil der Community" is reserved for Aktion 2.



17\. Successful registrations survive page reload.



18\. Duplicate Einspeise-MaLo records are prevented.



19\. The Tagesverlauf graph displays smooth production and Community

&#x20;   consumption series.



20\. The data model supports future 15-minute measurement values.



21\. S5 is identified as the future measurement/profile-data boundary.



22\. Generation, Community usage and surplus are visible.



23\. Community and Direktvermarktung price assumptions are visible.



24\. Simplified Community revenue, surplus revenue and total daily revenue

&#x20;   are visible.



25\. Revenue is not presented as profit or authoritative settlement.



26\. Surplus is conceptually connected to downstream Direktvermarktung.



27\. Lumenaza/BKV responsibilities are not implemented in the frontend.



28\. Reststrom and Ãœberschuss are not confused.



29\. The geographic rule remains replaceable/evolvable.



30\. The app anticipates Aktion 2 without implementing it.



31\. Existing producer/master data is reused rather than unnecessarily

&#x20;   re-entered.



32\. No fake S/4/VNB/Lumenaza/BKV internals are introduced.



33\. Existing functionality remains intact.



34\. No unnecessary framework or dependency is added.





# 47. Final Expected Flow



Existing Energy-Sharing context

&#x20;       â†“

Community Sonnenviertel

&#x20;       â†“

Community / participant / grid / Bilanzkreis / metering context

&#x20;       â†“

Meine Einspeiseanlage

&#x20;       â†“

4.1 Anlage anmelden

&#x20;       â†“

Einspeise-MaLo + Leistung + EE-Art

&#x20;       â†“

S1 / master-data context

&#x20;       â†“

PrÃ¼fung:

EE-Anlage

Gebiet

iMSys

&#x20;       â†“

4.2 Ãœbernahme bestÃ¤tigen

&#x20;       â†“

S2 boundary

&#x20;       â†“

S/4 / market process outside frontend

&#x20;       â†“

S3 confirmation or rejection

&#x20;       â†“

4.3 Antwort verarbeiten

&#x20;       â†“

if confirmed:

persist plant

&#x20;       â†“

4.4 Anlage ist angemeldet

&#x20;       â†“

Bereit zur Zuordnung

&#x20;       â†“

future Aktion 2

&#x20;       â†“

Teil der Community





Operational visualization:



15-minute measurement/profile context

&#x20;       â†“

S5 boundary

&#x20;       â†“

Erzeugung

&#x20;       â†“

Community-Verbrauch / allocation context

&#x20;       â†“

Community-Nutzung

&#x20;       â†“

Ãœberschuss

&#x20;       â†“

if surplus > 0

&#x20;       â†“

downstream Direktvermarktung

&#x20;       â†“

Lumenaza / BKV / trading outside frontend





Commercial MVP visualization:



Community-Nutzung

Ã— Community-VergÃ¼tung

&#x20;       â†“

Community-ErlÃ¶s



\+



Ãœberschuss

Ã— Direktvermarktungswert

&#x20;       â†“

Direktvermarktungs-ErlÃ¶s



&#x20;       â†“

ErlÃ¶s heute (MVP)





# 48. Implementation Instruction



First inspect the existing repository and understand the current

implementation.



Do not rewrite working functionality from scratch.



Modify the existing implementation incrementally.



Prefer the existing HTML/CSS/JavaScript architecture unless the repository

already establishes another approach.



Before finishing:



\- verify the complete Aktion-4 happy path

\- verify rejection

\- verify duplicate MaLo handling

\- verify persistence after reload

\- verify status semantics

\- verify responsive layout

\- verify dashboard calculations

\- verify that demo data is clearly identifiable

\- verify that no external system is falsely represented as implemented



Keep the implementation understandable, presentation-ready and easy for

other teams to integrate later.



