import React from 'react'

const Loading = input => {
  return (
    <React.Fragment>
      <div className="no-results-container">
        <p className="no-results-text"></p>
        <img className="no-results-image" src="/images/dino-loading.gif" alt="no results" />
        <p className="no-results-subtext">Loading {input} ...</p>
      </div>
    </React.Fragment>
  )
}

export default Loading
