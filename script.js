
document.addEventListener('DOMContentLoaded', () => {
    initializeLinkHandlers();
    initializeImageResizeObserver();
    preserveUrlParameters();
    initializeFramerAnimator();
});


function initializeLinkHandlers() {
    function openLink(url, rel = "", target = "") {
        let linkElement = document.createElement("a");
        linkElement.href = url;
        linkElement.target = target;
        linkElement.rel = rel;
        document.body.appendChild(linkElement);
        linkElement.click();
        linkElement.remove();
    }

    function onLinkClick(event) {
        if (this.dataset.hydrated) {
            this.removeEventListener("click", onLinkClick);
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        
        const href = this.getAttribute("href");
        if (!href) return;
        
        const isMac = /Mac|iPod|iPhone|iPad/u.test(navigator.userAgent);
        const newTab = isMac ? event.metaKey : event.ctrlKey;
        
        if (newTab) {
            openLink(href, "", "_blank");
        } else {
            const rel = this.getAttribute("rel") || "";
            const target = this.getAttribute("target") || "";
            openLink(href, rel, target);
        }
    }

    function onAuxClick(event) {
        if (this.dataset.hydrated) {
            this.removeEventListener("auxclick", onAuxClick);
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const href = this.getAttribute("href");
        if (href) {
            openLink(href, "", "_blank");
        }
    }

    function onKeyDown(event) {
        if (this.dataset.hydrated || event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        const href = this.getAttribute("href");
        if (href) {
            const rel = this.getAttribute("rel") || "";
            const target = this.getAttribute("target") || "";
            openLink(href, rel, target);
        }
    }

    document.querySelectorAll('[data-nested-link]').forEach(element => {
        if (element instanceof HTMLElement) {
            element.addEventListener("click", onLinkClick);
            element.addEventListener("auxclick", onAuxClick);
            element.addEventListener("keydown", onKeyDown);
        }
    });
}


function initializeImageResizeObserver() {
    function rewriteImageSizes() {
        for (let element of document.querySelectorAll("[data-framer-original-sizes]")) {
            const originalSizes = element.getAttribute("data-framer-original-sizes");
            if (originalSizes === "") {
                element.removeAttribute("sizes");
            } else {
                element.setAttribute("sizes", originalSizes);
            }
            element.removeAttribute("data-framer-original-sizes");
        }
    }
    window.__framer_onRewriteBreakpoints = rewriteImageSizes;
    rewriteImageSizes();
}


function preserveUrlParameters() {
    const variantParam = "framer_variant";

    function updateHrefWithParams(baseUrl, params) {
        let [path, hash] = baseUrl.split('#');
        hash = hash ? '#' + hash : '';
        let [basePath, existingQuery] = path.split('?');
        existingQuery = existingQuery ? '?' + existingQuery : '';

        const newParams = new URLSearchParams(existingQuery);
        const preservedParams = new URLSearchParams(params);

        for (let [key, value] of preservedParams) {
            if (!newParams.has(key) || key !== variantParam) {
                newParams.append(key, value);
            }
        }

        const newQueryString = newParams.toString();
        return newQueryString ? `${basePath}?${newQueryString}${hash}` : `${path}${hash}`;
    }

    if (window.location.search && !/bot|-google|google-|yandex|ia_archiver|crawl|spider/iu.test(navigator.userAgent)) {
        const internalLinksSelector = 'div#main a[href^="#"], div#main a[href^="/"], div#main a[href^="."], div#main a[data-framer-preserve-params]';
        const linksToUpdate = document.querySelectorAll(internalLinksSelector);
        
        for (let link of linksToUpdate) {
            const newHref = updateHrefWithParams(link.href, window.location.search);
            link.setAttribute("href", newHref);
        }
    }
}

/**
 * framer anime module
 */
function initializeFramerAnimator() {
    if (typeof animator === 'undefined') return;

    function runAppearAnimations() {
        const breakpointsContent = document.getElementById('__framer__breakpoints')?.textContent;
        const animationsContent = document.getElementById('__framer__appearAnimationsContent')?.textContent;

        if (!breakpointsContent || !animationsContent) return;

        try {
            const breakpoints = JSON.parse(breakpointsContent);
            const animations = JSON.parse(animationsContent);
            const activeVariant = animator.getActiveVariantHash(breakpoints);

            requestAnimationFrame(() => {
                animator.animateAppearEffects(
                    animations,
                    (selector, keyframes, options) => {
                        const element = document.querySelector(selector);
                        if (element) {
                            for (let [prop, value] of Object.entries(keyframes)) {
                                animator.startOptimizedAppearAnimation(element, prop, value, options[prop]);
                            }
                        }
                    },
                    "data-framer-appear-id",
                    "__Appear_Animation_Transform__",
                    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
                    activeVariant
                );
            });
        } catch (e) {
            console.error("Failed to parse or run Framer appear animations:", e);
        }
    }

    runAppearAnimations();
}
