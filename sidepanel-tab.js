document.addEventListener("DOMContentLoaded", async () => {
    let activeTab
    let hello
    let pageid
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      activeTab = tabs[0]
      or_tabId = activeTab.id
      hello = activeTab.url
      fetchComments()
    })
  
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab) {
          if (tab.active) {
            console.log("Tab switched to:", tab.url)
            if (tab.id == or_tabId) {
              document.getElementById("container").style.display = "block"
              document.getElementById("open").style.display = "none"
            } else {
              document.getElementById("container").style.display = "none"
              document.getElementById("open").style.display = "block"
  
              chrome.sidePanel.setOptions({
                tabId: tab.id,
                enabled: false,
                path: "sidepanel-tab.html", // Replace with your panel HTML file
              })
            }
          }
        }
      })
    })
  
    const commentsList = document.getElementById("commentsList")
    const newCommentText = document.getElementById("newCommentText")
    const submitComment = document.getElementById("submitComment")
    const sortCommentsButton = document.getElementById("sortComments")
    const darkModeToggle = document.getElementById("darkModeToggle")
  
    let comments = []
  
    function renderComments(commentsToRender) {
      commentsList.innerHTML = "" // Clear existing comments
      commentsToRender.forEach((comment) => {
        const commentCard = document.createElement("div")
        commentCard.classList.add("comment_container")
        commentCard.innerHTML = `
              <div class="comment_card">
                  <div class="comment_header">
                      <h3 class="comment_title">${comment.Username}</h3>
                      <span class="comment_timestamp">6 hours ago</span>
                  </div>
                  <p class="comment_content">${comment.Commentdata}</p>
                  <div class="comment_footer">
                      <div class="comment_actions">
                          <button class="action-button like-button" data-comment-id="${comment.id}">
                              <i class="fas fa-thumbs-up"></i> <span class="like-count">0</span>
                          </button>
                          <button class="action-button dislike-button" data-comment-id="${comment.id}">
                              <i class="fas fa-thumbs-down"></i> <span class="dislike-count">0</span>
                          </button>
                          <button class="reply-button" data-comment-id="${comment.id}">Reply</button>
                          <span class="sentiment-score">
                              ${getSentimentEmoji(comment.sentimentScore)} 
                              ${comment.sentimentScore ? comment.sentimentScore.toFixed(2) : "N/A"}
                          </span>
                      </div>
                      <div class="show-replies" data-comment-id="${comment.id}" style="display: none;">View replies</div>
                  </div>
              </div>
              <div class="nested-comments" id="replies-${comment.id}"></div>
              <div class="reply-form" id="reply-form-${comment.id}">
                  <input type="text" class="reply-input" placeholder="Add a reply...">
                  <div class="reply-actions">
                      <button class="reply-cancel">Cancel</button>
                      <button class="reply-submit" data-comment-id="${comment.id}">Reply</button>
                  </div>
              </div>
          `
        commentsList.appendChild(commentCard)
      })
  
      // Add event listeners for likes, dislikes, and replies
      document.querySelectorAll(".like-button, .dislike-button").forEach((button) => {
        button.addEventListener("click", handleVote)
      })
  
      document.querySelectorAll(".reply-button").forEach((button) => {
        button.addEventListener("click", (event) => {
          const commentId = event.target.dataset.commentId
          const replyForm = document.getElementById(`reply-form-${commentId}`)
          replyForm.classList.add("active")
        })
      })
  
      document.querySelectorAll(".reply-cancel").forEach((button) => {
        button.addEventListener("click", (event) => {
          const replyForm = event.target.closest(".reply-form")
          replyForm.classList.remove("active")
        })
      })
  
      document.querySelectorAll(".reply-submit").forEach((button) => {
        button.addEventListener("click", handleReply)
      })
  
      document.querySelectorAll(".show-replies").forEach((button) => {
        button.addEventListener("click", (event) => {
          const commentId = event.target.dataset.commentId
          const repliesContainer = document.getElementById(`replies-${commentId}`)
          repliesContainer.classList.toggle("active")
          event.target.textContent = repliesContainer.classList.contains("active") ? "Hide replies" : "View replies"
        })
      })
    }
  
    function getSentimentEmoji(score) {
      if (score === null || score === undefined) return ""
      if (score == 5) return "😍"
      if (score == 4) return "😊"
      if (score == 3) return "🙂"
      if (score == 2) return "😐"
      if (score == 1) return "🙁"
      return "😢"
    }
  
    function handleVote(event) {
      const button = event.currentTarget
      const commentId = button.dataset.commentId
      const isLike = button.classList.contains("like-button")
      const countSpan = button.querySelector("span")
      let count = Number.parseInt(countSpan.textContent)
      count++
      countSpan.textContent = count
  
      // Here you would typically send a request to your backend to update the vote count
      console.log(`${isLike ? "Liked" : "Disliked"} comment ${commentId}`)
    }
  
    async function handleReply(event) {
      const button = event.currentTarget
      const commentId = button.dataset.commentId
      const replyForm = button.closest(".reply-form")
      const replyInput = replyForm.querySelector(".reply-input")
      const replyText = replyInput.value.trim()
  
      if (replyText) {
        try {
          const sentimentResponse = await fetch("http://localhost:5000/api/sentiment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ comment: replyText }),
          })
  
          if (sentimentResponse.ok) {
            const sentimentData = await sentimentResponse.json()
            const repliesContainer = document.getElementById(`replies-${commentId}`)
            const replyElement = document.createElement("div")
            replyElement.classList.add("comment_container")
            replyElement.innerHTML = `
                      <div class="comment_card">
                          <div class="comment_header">
                              <h3 class="comment_title">User</h3>
                              <span class="comment_timestamp">Just now</span>
                          </div>
                          <p class="comment_content">${replyText}</p>
                          <div class="comment_footer">
                              <div class="comment_actions">
                                  <span class="sentiment-score">
                                      ${getSentimentEmoji(sentimentData.sentiment_score)} 
                                      ${sentimentData.sentiment_score.toFixed(2)}
                                  </span>
                              </div>
                          </div>
                      </div>
                  `
            repliesContainer.appendChild(replyElement)
            replyInput.value = ""
            replyForm.classList.remove("active")
  
            // Update reply count
            const replyCountElement = replyForm.closest(".comment_container").querySelector(".show-replies")
            const currentCount = repliesContainer.children.length
            replyCountElement.textContent = `View ${currentCount} ${currentCount === 1 ? "reply" : "replies"}`
            replyCountElement.style.display = "block"
  
            console.log(`Replied to comment ${commentId}: ${replyText}`)
          } else {
            console.error("Failed to analyze sentiment for reply")
          }
        } catch (error) {
          console.error("Error posting reply:", error)
        }
      }
    }
  
    // Fetch and render comments
    async function fetchComments() {
      try {
        console.log(hello)
        cleaned_url = hello.replace("https://", "")
        cleaned_url = cleaned_url.replace("www.", "")
        const currentPageUrl = await encodeURIComponent(cleaned_url)
        console.log(currentPageUrl)
  
        const apiEndpoint = `http://localhost:3333/view/page/details?forurl=${currentPageUrl}`
        const response = await fetch(apiEndpoint)
        if (!response.ok) throw new Error("Failed to fetch comments")
        const pagedetail = await response.json()
        pageid = pagedetail.page_details.Pageid
        console.log(pageid)
        console.log("hello")
        const response2 = await fetch(`http://localhost:3333/view/newest/comments/${pageid}/1`)
        if (!response2.ok) throw new Error("Failed to fetch comments")
        const commentsData = await response2.json()
        console.log(commentsData)
  
        comments = commentsData.newest_comments
        console.log(comments)
        renderComments(comments)
      } catch (error) {
        console.error("Error fetching comments:", error)
      }
    }
  
    submitComment.addEventListener("click", async () => {
      const message = newCommentText.value.trim()
  
      if (message === "") {
        alert("Please enter a comment")
        return
      }
      console.log("submit-debug")
      console.log(pageid)
      const pageId = pageid // Assume page ID is predefined
      const userId = 1 // Placeholder for user ID
  
      try {
        // Step 1: Perform sentiment analysis
        const sentimentResponse = await fetch("http://localhost:5000/api/sentiment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment: message }),
        })
  
        if (!sentimentResponse.ok) {
          console.error("Failed to analyze sentiment")
          return
        }
  
        const sentimentData = await sentimentResponse.json()
  
        // Step 2: Send comment data to the backend (excluding sentiment score)
        const commentPayload = {
          Pageid: pageId,
          Userid: userId,
          Commentdata: message,
        }
  
        const commentResponse = await fetch("http://localhost:3333/create/comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commentPayload),
        })
  
        if (!commentResponse.ok) {
          console.error("Failed to post comment")
          return
        }
  
        // Step 3: Dynamically update the comments section with sentiment score
        const newComment = {
          id: Date.now(), // Temporary ID
          Username: "shone",
          Commentdata: message,
          sentimentScore: sentimentData.sentiment_score, // Include sentiment score for dynamic display
        }
        console.log("test")
        console.log(newComment)
  
        comments.unshift(newComment) // Add the new comment to the top
        console.log(comments)
        renderComments(comments) // Rerender the comments list
        newCommentText.value = "" // Clear the input field
      } catch (error) {
        console.error("Error:", error)
      }
    })
  
    sortCommentsButton.addEventListener("click", () => {
      comments.reverse()
      renderComments(comments)
    })
  
    // Toggle dark mode
    darkModeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode")
      const isDarkMode = document.body.classList.contains("dark-mode")
      darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>'
    })
  
    // Enable/disable submit button based on textarea content
    newCommentText.addEventListener("input", () => {
      submitComment.disabled = newCommentText.value.trim() === ""
    })
  
    // Initial fetch of comments
    fetchComments()
  })
  
  