const sections = document.querySelectorAll("section");

function updateSectionAnimations() {
  sections.forEach((section) => {
    const top = window.scrollY;
    const offset = section.offsetTop - 100;
    const height = section.offsetHeight;

    if (top >= offset && top < offset + height) {
      section.classList.add("show-animate");
    } else {
      section.classList.remove("show-animate");
    }
  });
}

window.addEventListener("scroll", updateSectionAnimations);
window.addEventListener("load", updateSectionAnimations);
