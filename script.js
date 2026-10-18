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

const moviePlayer = document.querySelector(".movie-player");

moviePlayer?.addEventListener("click", () => {
  const videoId = (moviePlayer.dataset.videoId || "").trim();

  if (!/^[\w-]{11}$/.test(videoId)) {
    window.alert("紹介動画は現在準備中です。");
    return;
  }

  const frame = moviePlayer.closest(".movie-frame");
  if (!frame) return;

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  iframe.title = moviePlayer.dataset.videoTitle || "紹介動画";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;

  moviePlayer.remove();
  frame.appendChild(iframe);
});
