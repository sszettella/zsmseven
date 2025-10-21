document.addEventListener("DOMContentLoaded",function(){const e=document.getElementById("hamburger"),t=document.getElementById("nav-links");e&&t&&e.addEventListener("click",function(){t.classList.toggle("active")});document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",function(e){e.preventDefault();const t=this.getAttribute("href").substring(1),n=document.getElementById(t);n&&n.scrollIntoView({behavior:"smooth"})})})});

// Fetch latest portfolio analysis
const latestAnalysisDiv = document.getElementById('latest-analysis');
if (latestAnalysisDiv) {
  fetch('https://api.zsmproperties.com/dev/get-portfolio-analysis?portfolio_name=ZSM%20Seven')
    .then(response => response.text())
    .then(html => {
      latestAnalysisDiv.innerHTML = html;
    })
    .catch(error => {
      latestAnalysisDiv.innerHTML = 'Unable to load latest analysis.';
      console.error('Error fetching analysis:', error);
    });
}