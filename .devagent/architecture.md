---
description: This describes the overall technical architecture of this project. Take special note of the release strategy to identiify incremental requirements.
---
### Release notes:

These Release Notes must help you understand which requirements are new requirements and what has already been released. By default, you MUST FOCUS STRICTLY ON NEW REQUIREMENTS while older releases may be used for reference.

- v1: Initial application release.

- v2 : UI changes targeting a LinkedIn style look.

    - v2.1 : Dynamic submit form.

- v3 : Incorporate HANA DB for storing records.

- v4 (NEW) : Team interactions

---

The application contains of a single-page applicaiton that allows individual contributors (team members) to submit and view achievements. The main goal of this application is to make self-bragging simple so that variations in team members abilities to self-express can be eliminated.

## Individual contributor

An individual contributor (team member) may start with a very simple statement such as, "Today I helped my customer by ...". 

Some preliminary questions that must be always included are (NOTE that these questions are in addition to the 3 to 5 further deep-dive questions mentioned earlier):

- ask if there is an email or verbal appreciation provided by someone. If an email is available, then they should copy/paste the email excerpt into the textbox.

- whether this accomplishment was impactful for team or customer?

In order to capture better details about the accomplishment, contextual questions are generated (*** using AI ***) and asked to the team member.

Once this information is provided, a professionally-written accomplishment statement must be generated (*** using AI ***). 

### Tone

Make sure the tone of the accomplishment statement is humble, authentic, non-marketing, and use part or whole of quoted statements (if available). The statement must be written in third-person, in plain text (so manager can read them out), and less than 200 (v1) 100 (v2) words.


## Technical implemetation

The application must be developed using nodejs for backend apis and HTML/CSS/JS for UI. Data will be stored in some document store, so JSON based schema will be best choice.

### Mandatory Project Scaffolding

- / : contains NodeJS server (index.js).

- /ui : contains app router (app.js) and all HTML/CSS/JS files. Separate each file type in proper page structure. For example, create a folder for each page and within it create .html, .css, and .js files.

- /ai : contains an AI orchestrator module so that LLM models can be switched appropriately. More details on LLM are provided in the `AI` section below.

- /db : contains the db-server module. Test data can also be stored in this directory.

### UX 

(v1) In addition to a root homepage, there must be two additional entry points as below:

- / 

- /submit

- /view

(v2) The roles of the pages is changing in this relase. A LinkedIn style look and feel is expected as follows:

- / : The root page opens up a feed of all accomplishments with unlimited scrolling. New accomplishments on the top. Each accomplishment is within a card.

- /submit : Allows team member to submit new accomplishment, but also lists all their own past submissions.

(v2) The design of the accomplishment card is the main attraction of this app. It must clearly show the contributor's name and their thumbnail picture followed by accomplishment (generated summary). Only cards in the /submit pages should allow viewing the details behind the entries. The top-right corner must show the type of impact this accomplishment caused. (v4) Whereas, bottom bar of the card contains various interactions for the team, such as:

- Congratulations (clapping) : to congratulate the achiever. Show counter of congrats received.

- Votes (stars) : to vote for top achievements. Show count of votes received.

- Copy (copy) : so that the accomplishment can be copied and pasted in other forums.

(v2.1) Additional context is collected as 2 or 3 dynamically generated short questions that are relevant based on the initial accomplishment statement provided by the team member. 

(v1) There can be sub-pages underneeth to help further navigation into details.

(v1) Both the contributor and manager must be able to view lists, although contributor must only be able to view their list and manager should be able to view all submissions.

### Data

(v1) Use browser data storage. Create a special DB module to handle this so that it can be replaced later with another database.

(v3) Use hana-client to rewrite the db-server so that all CRUD operations can be supported. 

(v2.1) Data structure to store accomplishments consists of team member details, the original accomplishment statement, type of impact (whether to internal teams or to the customer), any email or verbal statements, and additional context, which could be made up of concatenated dynamically generated questions and provided responses.

(v4) We do not need to store folks who interacted in any form, but just a counter against each reaction will be good enough.

### AI

Create LLM prompts in separate files for each use case which will improve maintainability of the prompts. A good LLM prompt contains SYSTEM, CONTEXT, TASK, FORMAT (must generate response in plain text without any formatting).

We have following AI use cases in this app:

- Generate accomplishment statement.

- Generate contextual questions to capture accomplishment details.