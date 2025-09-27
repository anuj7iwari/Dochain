
document.addEventListener('DOMContentLoaded', () => {
    initializeScripts();
});

function initializeScripts() {
   
    try {
        if (localStorage.get("__framer_force_showing_editorbar_since")) {
            const link = document.createElement("link");
            link.rel = "modulepreload";
            link.href = "https://framer.com/edit/init.mjs";
            document.head.appendChild(link);
        }
    } catch (e) {}

    
    const eventScript = document.createElement('script');
    eventScript.async = true;
    eventScript.src = "https://events.framer.com/script?v=2";
    eventScript.dataset.fid = "1bffad171fa188667323a9997db59f683dd7719bd093dfe2b476540bc2ac438c";
    eventScript.dataset.noNt = true;
    document.body.prepend(eventScript);

    initializeLinkHandlers();
    initializeImageResizeObserver();
    preserveUrlParameters();
    initializeFramerAnimator();
}




function initializeLinkHandlers() {

}


function initializeImageResizeObserver() {
    
}


