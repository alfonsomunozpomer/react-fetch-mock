import React from 'react'
import fetchMock from 'fetch-mock'
import Enzyme from 'enzyme'
import {shallow, mount, render} from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

Enzyme.configure({ adapter: new Adapter() })

const DELAY_MS = 2000

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const fetchResponseJson = async (url) => {
  try {
    const response = await fetch(url)
    const responseJson = await response.json()
    // You can introduce here an artificial delay, both Promises and async/await will wait until the function returns
    // await sleep(DELAY_MS)
    return responseJson
  }
  catch (e) {
    console.log(`fetchResponseJson failed:`, e)
  }
}

class SimpleComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = { data: null }
  }

  render() {
    return(
      <span>{JSON.stringify(this.state.data)}</span>
    )
  }

  // By returning the promise (a call to an async function) we can await componentDidMount
  componentDidMount() {
    return fetchResponseJson(`http://foo.bar`).then((responseJson) => {
      this.setState({
        data: responseJson
      })
    })
  }
}


// ------------------------------------- TESTS -------------------------------------

// Manual mocking
// const fetchPromise = Promise.resolve({
//   json: () => Promise.resolve({Rick: `I turned myself into a pickle, Morty!`}),
// })
// global.fetch = () => fetchPromise

fetchMock.get(`*`, JSON.stringify({Rick: `I turned myself into a pickle, Morty!`}))

describe(`Mocking fetch`, () => {

  test(`fails with synchronous code`, () => {
    const responseJson = fetchResponseJson(`http://foo.bar`)
    expect(responseJson).not.toHaveProperty(`Rick`, `I turned myself into a pickle, Morty!`)
  })

  test(`using promises`, () => {
    expect.assertions(1)
    // Must return or the expect will not run within this test!
    return fetchResponseJson(`http://foo.bar`).then(
      (responseJson) => { expect(responseJson).toHaveProperty(`Rick`, `I turned myself into a pickle, Morty!`) })
  })

  test(`using async/await`, async () => {
    const responseJson = await fetchResponseJson(`http://foo.bar`)
    expect(responseJson).toHaveProperty(`Rick`, `I turned myself into a pickle, Morty!`)
  })

  test(`on a React component that loads data into state in componentDidMount`, async () => {
    const wrapper = shallow(<SimpleComponent />)

    await wrapper.instance().componentDidMount()
    // Much less robust, you need to ensure that the sleeping time is greater than the time it takes to resolve the
    // fetch, play with values less than or greater than L18 above to see how the component changes
    // await sleep(DELAY_MS - 1000)
    // await sleep(DELAY_MS + 1000)

    // State can be tested here, but not DOM properties, because setState happens in... the future!
    // This is more of an Enzyme thing, I suspect
    expect(wrapper.state(`data`)).toHaveProperty(`Rick`, `I turned myself into a pickle, Morty!`)
    expect(wrapper.text()).not.toEqual(JSON.stringify({Rick: `I turned myself into a pickle, Morty!`}))

    // Force update to sync component with state
    wrapper.update()
    expect(wrapper.text()).toBe(`{"Rick":"I turned myself into a pickle, Morty!"}`)
  })
})
