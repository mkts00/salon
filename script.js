const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.1 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const reservationDialog = document.querySelector("#reservation-dialog");
const openReservationButton = document.querySelector("[data-open-reservation]");
const closeDialogButton = document.querySelector(".dialog-close");
const returnButton = document.querySelector(".dialog-return");

function openReservationDialog() {
  reservationDialog.showModal();
  document.body.classList.add("dialog-open");
}

function closeReservationDialog() {
  reservationDialog.close();
  document.body.classList.remove("dialog-open");
}

openReservationButton?.addEventListener("click", openReservationDialog);
closeDialogButton?.addEventListener("click", closeReservationDialog);
returnButton?.addEventListener("click", closeReservationDialog);

reservationDialog?.addEventListener("click", (event) => {
  if (event.target === reservationDialog) closeReservationDialog();
});

reservationDialog?.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
});
