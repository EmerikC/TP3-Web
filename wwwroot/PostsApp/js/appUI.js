const periodicRefreshPeriod = 3;
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let searchKeywords = "";
let pageManager = null;
let searchVisible = false;

Init_UI();

function Init_UI() {
    pageManager = new PageManager('scrollPanel', 'postsPanel', 'postSample', renderPostsFromQueryString);
    
    $('#createPost').on("click", async function () {
        renderCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#toggleSearch').on("click", function () {
        toggleSearchSection();
    });
    $("#searchInput").on("input", function () {
        if (searchVisible) {
            searchKeywords = $(this).val().trim();
            pageManager.reset();
        }
    });
    
    start_Periodic_Refresh();
    renderPosts();
}

function toggleSearchSection() {
    searchVisible = !searchVisible;
    if (searchVisible) {
        $('#searchSection').addClass('visible');
        $('#searchInput').focus();
        // Reactivate search with current input value
        let currentInputValue = $('#searchInput').val().trim();
        if (currentInputValue !== '') {
            searchKeywords = currentInputValue;
            pageManager.reset();
        }
    } else {
        $('#searchSection').removeClass('visible');
        // Only reset if there were active search keywords
        if (searchKeywords !== "") {
            searchKeywords = "";
            pageManager.reset();
        }
    }
}

function showPosts() {
    $("#actionTitle").text("Fil de nouvelles");
    $("#createPost").show();
    $("#dropdownMenu").show();
    $("#toggleSearch").show();
    $("#abort").hide();
    $("#scrollPanel").show();
    $(".dynamicContent").remove();
    hold_Periodic_Refresh = false;
    // Restore search section visibility state
    if (searchVisible) {
        $('#searchSection').addClass('visible');
    } else {
        $('#searchSection').removeClass('visible');
    }
    // Show pageManager to restore scroll functionality
    pageManager.show(false);
}

function renderPosts() {
    $("#actionTitle").text("Fil de nouvelles");
    $("#createPost").show();
    $("#dropdownMenu").show();
    $("#toggleSearch").show();
    $("#abort").hide();
    $("#scrollPanel").show();
    $(".dynamicContent").remove();
    hold_Periodic_Refresh = false;
    // Restore search section visibility state
    if (searchVisible) {
        $('#searchSection').addClass('visible');
    } else {
        $('#searchSection').removeClass('visible');
    }
    pageManager.reset();
}

function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await Posts_API.Head();
            if (currentETag !== etag) {
                currentETag = etag;
                await pageManager.update(false);
            }
        }
    }, periodicRefreshPeriod * 1000);
}

function renderAbout() {
    hold_Periodic_Refresh = true;
    pageManager.hide();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#toggleSearch").hide();
    $('#searchSection').removeClass('visible');
    $("#abort").show();
    $("#actionTitle").text("À propos...");
    $(".dynamicContent").remove();
    $("#content").append(
        $(`
            <div class="aboutContainer dynamicContent">
                <h2>Gestionnaire de nouvelles</h2>
                <hr>
                <p>
                    Cette application permet de gérer une liste de nouvelles.
                </p>
                <p>
                    Vous pouvez créer, modifier et supprimer des nouvelles.
                </p>
                <p>
                    Les nouvelles sont affichées en ordre chronologique décroissant.
                </p>
                <p>
                    Vous pouvez filtrer les nouvelles par catégorie.
                </p>
                <p>
                    Vous pouvez rechercher des nouvelles par mots-clés.
                </p>
                <p>
                    Les nouvelles se chargent au fur et à mesure que vous défilez.
                </p>
            </div>
        `)
    );
}

function updateDropDownMenu(categories) {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        <div class="dropdown-divider"></div>
    `));
    
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    });
    
    DDMenu.append($(`
        <div class="dropdown-divider"></div> 
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
    `));
    
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        selectedCategory = "";
        pageManager.reset();
    });
    $('.category').on("click", function () {
        selectedCategory = $(this).text().trim();
        pageManager.reset();
    });
}

async function compileCategories() {
    // Fetch all posts but only return Category field for efficiency
    let allPosts = await Posts_API.Get("?select=Category&sort=Category");
    let categories = [];
    if (allPosts !== null) {
        allPosts.forEach(post => {
            if (!categories.includes(post.Category))
                categories.push(post.Category);
        });
        updateDropDownMenu(categories.sort());
    }
}

async function renderPostsFromQueryString(itemsPanel, queryString) {
    hold_Periodic_Refresh = false;
    
    queryString += "&sort=-Creation";
    if (selectedCategory != "") queryString += "&Category=" + selectedCategory;
    if (searchKeywords !== "") queryString += "&keywords=" + searchKeywords.replace(/ /g, ',');
    
    let posts = await Posts_API.Get(queryString);
    currentETag = Posts_API.Etag;
    
    if (posts !== null) {
        // Update categories menu with ALL categories (not just filtered ones)
        compileCategories();
        
        // Add posts to page
        posts.forEach(post => {
            itemsPanel.append(renderPost(post));
        });
        
        // Highlight keywords after rendering
        if (searchKeywords !== "") {
            highlightKeywords(searchKeywords);
        }
        
        // Attach click events for expand/collapse
        $('.expandText').on("click", function () {
            let postId = $(this).attr("postId");
            let textElement = $(`#postText_${postId}`);
            let chevron = $(this);
            
            if (textElement.hasClass('hideExtra')) {
                textElement.removeClass('hideExtra').addClass('showExtra');
                chevron.removeClass('bi-chevron-double-down').addClass('bi-chevron-double-up');
            } else {
                textElement.addClass('hideExtra').removeClass('showExtra');
                chevron.removeClass('bi-chevron-double-up').addClass('bi-chevron-double-down');
            }
        });
        
        // Attach click events for edit/delete
        $(".editCmd").on("click", function () {
            renderEditPostForm($(this).attr("editPostId"));
        });
        $(".deleteCmd").on("click", function () {
            renderDeletePostForm($(this).attr("deletePostId"));
        });
        
        // Return true if no posts (end of data)
        return posts.length === 0;
    } else {
        return true; // Error occurred, end pagination
    }
}

function renderError(message = "") {
    hold_Periodic_Refresh = true;
    message = (message == "" ? Posts_API.currentHttpError : message);
    pageManager.hide();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#toggleSearch").hide();
    $('#searchSection').removeClass('visible');
    $("#abort").show();
    $("#actionTitle").text("Erreur");
    $(".dynamicContent").remove();
    $("#content").append(
        $(`
            <div class="errorContainer dynamicContent">
                ${message}
            </div>
        `)
    );
}

function renderCreatePostForm() {
    renderPostForm();
}

async function renderEditPostForm(id) {
    hold_Periodic_Refresh = true;
    pageManager.hide();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#toggleSearch").hide();
    $('#searchSection').removeClass('visible');
    $("#abort").show();
    $(".dynamicContent").remove();
    $("#content").append($("<div class='waitingGifcontainer dynamicContent'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    
    let post = await Posts_API.Get(id);
    if (post !== null)
        renderPostForm(post);
    else
        renderError("Nouvelle introuvable!");
}

async function renderDeletePostForm(id) {
    hold_Periodic_Refresh = true;
    pageManager.hide();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#toggleSearch").hide();
    $('#searchSection').removeClass('visible');
    $("#abort").show();
    $("#actionTitle").text("Retrait");
    $(".dynamicContent").remove();
    $("#content").append($("<div class='waitingGifcontainer dynamicContent'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    
    let post = await Posts_API.Get(id);
    $(".dynamicContent").remove();
    
    if (post !== null) {
        $("#content").append(`
        <div class="postDeleteForm dynamicContent">
            <h4>Effacer la nouvelle suivante?</h4>
            <br>
            ${renderPostPreview(post)}
            <br>
            <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </div>    
        `);
        $('#deletePost').on("click", async function () {
            $(".dynamicContent").remove();
            $("#content").append($("<div class='waitingGifcontainer dynamicContent'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
            let result = await Posts_API.Delete(post.Id);
            if (result)
                showPosts();
            else
                renderError();
        });
        $('#cancel').on("click", function () {
            showPosts();
        });
    } else {
        renderError("Nouvelle introuvable!");
    }
}

function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

function newPost() {
    let post = {};
    post.Id = "";
    post.Title = "";
    post.Text = "";
    post.Category = "";
    post.Image = "";
    post.Creation = Date.now();
    return post;
}

function renderPostForm(post = null) {
    hold_Periodic_Refresh = true;
    pageManager.hide();
    $("#createPost").hide();
    $("#dropdownMenu").hide();
    $("#toggleSearch").hide();
    $('#searchSection').removeClass('visible');
    $("#abort").show();
    $(".dynamicContent").remove();
    
    let create = post == null;
    if (create) {
        post = newPost();
    }
    
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#content").append(`
        <form class="form dynamicContent" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="Creation" id="Creation" value="${post.Creation}"/>

            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                RequireMessage="Veuillez entrer une catégorie"
                value="${post.Category}"
            />
            
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                value="${post.Title}"
            />

            <label for="Text" class="form-label">Texte </label>
            <textarea 
                class="form-control"
                name="Text"
                id="Text"
                placeholder="Texte de la nouvelle"
                rows="8"
                required
                RequireMessage="Veuillez entrer un texte"
            >${post.Text}</textarea>
            
            <label class="form-label">Image </label>
            <div class='imageUploader' 
                 newImage='${create}' 
                 controlId='Image' 
                 imageSrc='${post.Image || "news-logo.png"}' 
                 waitingImage="Loading_icon.gif">
            </div>
            
            ${!create ? `
            <br>
            <div class="form-check">
                <input type="checkbox" class="form-check-input" id="preserveDate" checked>
                <label class="form-check-label" for="preserveDate">
                    Conserver la date de création
                </label>
            </div>
            ` : ''}
            
            <br>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    
    initImageUploaders();
    initFormValidation();
    
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let postData = getFormData($("#postForm"));
        
        // Handle date: if editing and checkbox is unchecked, update to current date
        let dateChanged = false;
        if (!create && !$('#preserveDate').is(':checked')) {
            postData.Creation = Date.now();
            dateChanged = true;
        } else {
            postData.Creation = parseInt(postData.Creation);
        }
        
        $(".dynamicContent").remove();
        $("#content").append($("<div class='waitingGifcontainer dynamicContent'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
        
        let result = await Posts_API.Save(postData, create);
        if (result) {
            // If date changed, reset to top to show the edited post in new position
            if (dateChanged) {
                renderPosts();
            } else {
                showPosts();
            }
        } else {
            if (Posts_API.currentStatus == 409)
                renderError("Erreur: Conflit de titres...");
            else
                renderError();
        }
    });
    
    $('#cancel').on("click", function () {
        showPosts();
    });
}

function renderPostPreview(post) {
    let date = convertToFrenchDate(post.Creation);
    return `
        <div class="postRow">
            <div class="postContainer">
                <div class="postLayout">
                    <div class="postHeader">
                        <span class="postCategory">${post.Category}</span>
                        <h5 class="postTitle">${post.Title}</h5>
                    </div>
                    <img class="postImage" src="${post.Image}" alt="${post.Title}">
                    <div class="postDate">${date}</div>
                    <div class="postText">${post.Text}</div>
                </div>
            </div>
        </div>
    `;
}

function renderPost(post) {
    let date = convertToFrenchDate(post.Creation);
    let imageHtml = post.Image ? `<img class="postImage" src="${post.Image}" alt="${post.Title}">` : '';
    
    return $(`
        <div class="postRow" post_id="${post.Id}">
            <div class="postContainer">
                <div class="postLayout">
                    <div class="postHeader">
                        <span class="postCategory">${post.Category}</span>
                        <h5 class="postTitle">${post.Title}</h5>
                    </div>
                    ${imageHtml}
                    <div class="postDate">${date}</div>
                    <div id="postText_${post.Id}" class="postText hideExtra">${post.Text}</div>
                    <div class="postFooter">
                        <i class="expandText bi bi-chevron-double-down" postId="${post.Id}" title="Afficher plus"></i>
                    </div>
                </div>
                <div class="postCommandPanel">
                    <span class="editCmd cmdIcon fa fa-pencil" editPostId="${post.Id}" title="Modifier ${post.Title}"></span>
                    <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${post.Id}" title="Effacer ${post.Title}"></span>
                </div>
            </div>
        </div>           
    `);
}

// Helper function: convertToFrenchDate (from new-functions.js)
function convertToFrenchDate(numeric_date) {
    let date = new Date(numeric_date);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    var opt_weekday = { weekday: 'long' };
    var weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }
    return weekday + " le " + date.toLocaleDateString("fr-FR", options) + " @ " + date.toLocaleTimeString("fr-FR");
}

// Helper function: highlight (from new-functions.js)
function highlight(text, keyword) {
    let startIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (startIndex !== -1) {
        let endIndex = startIndex + keyword.length;
        let originalKeyword = text.substring(startIndex, endIndex);
        let before = text.substring(0, startIndex);
        let after = text.substring(endIndex);
        return before + `<span class='highlight'>${originalKeyword}</span>` + after;
    }
    return text;
}

// Helper function: highlightKeywords (from new-functions.js)
function highlightKeywords(keywords) {
    let keywordArray = keywords.toLowerCase().split(' ');
    
    $('.postTitle').each(function () {
        let originalText = $(this).text();
        let highlightedText = originalText;
        keywordArray.forEach(keyword => {
            if (keyword.trim() !== '') {
                highlightedText = highlight(highlightedText, keyword);
            }
        });
        $(this).html(highlightedText);
    });
    
    $('.postText').each(function () {
        let originalText = $(this).text();
        let highlightedText = originalText;
        keywordArray.forEach(keyword => {
            if (keyword.trim() !== '') {
                highlightedText = highlight(highlightedText, keyword);
            }
        });
        $(this).html(highlightedText);
    });
}
