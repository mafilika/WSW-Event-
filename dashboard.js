// ========================================
// FIREBASE IMPORTS
// ========================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";


import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";


// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {

  apiKey:
    "AIzaSyAT6_OS3lgaXNGldWrpkV7by52cfWfpy9A",

  authDomain:
    "wsw-event.firebaseapp.com",

  projectId:
    "wsw-event",

  storageBucket:
    "wsw-event.firebasestorage.app",

  messagingSenderId:
    "1021036012955",

  appId:
    "1:1021036012955:web:9712358aa7d69252126d3e"

};


// ========================================
// INITIALIZE FIREBASE
// ========================================

const app =
  initializeApp(
    firebaseConfig
  );


const db =
  getFirestore(app);


// ========================================
// ELEMENTS
// ========================================

const totalTickets =
  document.getElementById(
    "totalTickets"
  );


const attended =
  document.getElementById(
    "attended"
  );


const remaining =
  document.getElementById(
    "remaining"
  );


const percentage =
  document.getElementById(
    "percentage"
  );


const progressText =
  document.getElementById(
    "progressText"
  );


const progressBar =
  document.getElementById(
    "progressBar"
  );


const attendeeTable =
  document.getElementById(
    "attendeeTable"
  );


const recentCheckIns =
  document.getElementById(
    "recentCheckIns"
  );


const searchInput =
  document.getElementById(
    "searchInput"
  );


// ========================================
// DATA
// ========================================

let allTickets = [];


// ========================================
// LISTEN TO FIREBASE
// ========================================

const ticketsReference =
  collection(
    db,
    "Tickets"
  );


onSnapshot(

  ticketsReference,

  (snapshot) => {

    allTickets = [];


    snapshot.forEach(
      (documentSnapshot) => {

        allTickets.push({

          id:
            documentSnapshot.id,

          ...documentSnapshot.data()

        });

      }
    );


    updateDashboard();

  },


  (error) => {

    console.error(
      "Dashboard Firebase error:",
      error
    );


    attendeeTable.innerHTML = `

      <tr>

        <td colspan="5">

          Unable to load attendance data.

        </td>

      </tr>

    `;

  }

);


// ========================================
// UPDATE DASHBOARD
// ========================================

function updateDashboard() {

  const total =
    allTickets.length;


  const checkedIn =
    allTickets.filter(
      ticket =>
        isCheckedIn(ticket)
    ).length;


  const notCheckedIn =
    total -
    checkedIn;


  const attendanceRate =
    total > 0
      ?
      (
        checkedIn /
        total
      ) * 100
      :
      0;


  // ========================================
  // STATISTICS
  // ========================================

  totalTickets.textContent =
    total;


  attended.textContent =
    checkedIn;


  remaining.textContent =
    notCheckedIn;


  percentage.textContent =
    attendanceRate.toFixed(1) +
    "%";


  progressText.textContent =
    attendanceRate.toFixed(1) +
    "%";


  progressBar.style.width =
    Math.min(
      attendanceRate,
      100
    ) + "%";


  renderTable(
    allTickets
  );


  renderRecentCheckIns(
    allTickets
  );

}


// ========================================
// CHECK STATUS
// ========================================

function isCheckedIn(ticket) {

  const status =
    String(
      ticket.Status ||
      ticket.status ||
      ""
    )
    .trim()
    .toLowerCase();


  return status ===
    "checked in";

}


// ========================================
// SEARCH
// ========================================

searchInput
  .addEventListener(
    "input",
    function () {

      const search =
        this.value
          .trim()
          .toLowerCase();


      if (!search) {

        renderTable(
          allTickets
        );

        return;

      }


      const filtered =
        allTickets.filter(
          ticket => {

            const ticketNumber =
              String(
                ticket.id ||
                ""
              )
              .toLowerCase();


            const name =
              String(
                ticket.Name ||
                ticket.name ||
                ""
              )
              .toLowerCase();


            return (

              ticketNumber
                .includes(search)

              ||

              name
                .includes(search)

            );

          }
        );


      renderTable(
        filtered
      );

    }
  );


// ========================================
// RENDER TABLE
// ========================================

function renderTable(
  tickets
) {

  if (
    tickets.length === 0
  ) {

    attendeeTable.innerHTML = `

      <tr>

        <td colspan="5">

          No tickets found.

        </td>

      </tr>

    `;

    return;

  }


  const sorted =
    [...tickets].sort(
      sortTickets
    );


  attendeeTable.innerHTML =
    sorted
      .map(
        ticket =>
          createTableRow(
            ticket
          )
      )
      .join("");

}


// ========================================
// CREATE TABLE ROW
// ========================================

function createTableRow(
  ticket
) {

  const ticketId =
    escapeHtml(
      ticket.id ||
      ""
    );


  const name =
    escapeHtml(
      ticket.Name ||
      ticket.name ||
      "Not available"
    );


  const ticketType =
    escapeHtml(
      ticket.TicketType ||
      ticket.ticketType ||
      "General"
    );


  const checked =
    isCheckedIn(ticket);


  const status =
    checked
      ?
      `<span class="status checked">
        CHECKED IN
       </span>`
      :
      `<span class="status waiting">
        NOT CHECKED IN
       </span>`;


  const checkInTime =
    checked &&
    ticket.checkedInAt

      ?

    formatDate(
      ticket.checkedInAt
    )

      :

    "—";


  return `

    <tr>

      <td>
        <strong>
          ${ticketId}
        </strong>
      </td>

      <td>
        ${name}
      </td>

      <td>
        ${ticketType}
      </td>

      <td>
        ${status}
      </td>

      <td>
        ${checkInTime}
      </td>

    </tr>

  `;

}


// ========================================
// RECENT CHECK-INS
// ========================================

function renderRecentCheckIns(
  tickets
) {

  const checkedInTickets =
    tickets
      .filter(
        ticket =>
          isCheckedIn(ticket) &&
          ticket.checkedInAt
      )
      .sort(
        (a, b) => {

          const dateA =
            getTimestamp(
              a.checkedInAt
            );


          const dateB =
            getTimestamp(
              b.checkedInAt
            );


          return dateB -
            dateA;

        }
      )
      .slice(
        0,
        10
      );


  if (
    checkedInTickets.length === 0
  ) {

    recentCheckIns.innerHTML = `

      <div class="empty">

        No guests have checked in yet.

      </div>

    `;

    return;

  }


  recentCheckIns.innerHTML =
    checkedInTickets
      .map(
        ticket =>
          createRecentItem(
            ticket
          )
      )
      .join("");

}


// ========================================
// RECENT ITEM
// ========================================

function createRecentItem(
  ticket
) {

  const name =
    escapeHtml(
      ticket.Name ||
      ticket.name ||
      "Guest"
    );


  const ticketId =
    escapeHtml(
      ticket.id
    );


  const time =
    formatDate(
      ticket.checkedInAt
    );


  return `

    <div class="recent-item">

      <div class="recent-icon">
        ✓
      </div>

      <div class="recent-info">

        <strong>
          ${name}
        </strong>

        <span>
          ${ticketId}
        </span>

      </div>

      <time>
        ${time}
      </time>

    </div>

  `;

}


// ========================================
// SORT TICKETS
// ========================================

function sortTickets(
  a,
  b
) {

  const aChecked =
    isCheckedIn(a);


  const bChecked =
    isCheckedIn(b);


  if (
    aChecked &&
    !bChecked
  ) {

    return -1;

  }


  if (
    !aChecked &&
    bChecked
  ) {

    return 1;

  }


  return String(
    a.id
  ).localeCompare(
    String(b.id)
  );

}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(
  timestamp
) {

  if (
    timestamp &&
    timestamp.toDate
  ) {

    return timestamp
      .toDate()
      .toLocaleString(
        "en-ZA",
        {
          dateStyle:
            "short",

          timeStyle:
            "short"
        }
      );

  }


  return "—";

}


// ========================================
// TIMESTAMP
// ========================================

function getTimestamp(
  timestamp
) {

  if (
    timestamp &&
    timestamp.toDate
  ) {

    return timestamp
      .toDate()
      .getTime();

  }


  return 0;

}


// ========================================
// SECURITY
// ========================================

function escapeHtml(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

  }
