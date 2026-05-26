window.addEventListener('scroll', () => {

const cards = document.querySelectorAll('.card');
const steps = document.querySelectorAll('.step');

cards.forEach(card => {
const position = card.getBoundingClientRect().top;
const screen = window.innerHeight / 1.2;

if(position < screen){
card.style.opacity = "1";
card.style.transform = "translateY(0)";
}
});

steps.forEach(step => {
const position = step.getBoundingClientRect().top;
const screen = window.innerHeight / 1.2;

if(position < screen){
step.style.opacity = "1";
step.style.transform = "translateY(0)";
}
});

});

document.querySelectorAll('.card,.step').forEach(item=>{

item.style.opacity="0";
item.style.transform="translateY(40px)";
item.style.transition=".7s";

});