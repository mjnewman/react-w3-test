import React, { Component } from 'react';
import SimpleStorageContract from './contracts/NFTest.json';
import Web3 from 'web3';

import { Container, Row, Col, Card, Button, } from 'react-bootstrap';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null, pttTokens: [] };

  componentDidMount = async () => {
    try {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        this.setState({ web3 });
      }
    } catch (error) {
      console.error(error);
    }
  };

  buttonClick = async () => {
    const { web3 } = this.state;
    try {
      const { web3 } = this.state;
      
      await window.ethereum.enable();

      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = SimpleStorageContract.networks[networkId];
      const instance = new web3.eth.Contract(
        SimpleStorageContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      this.setState({ web3, accounts, contract: instance }, this.loadContract);
    } catch (error) {
      alert('Failed to load web3, accounts, or contract.');
      console.error(error);
    }
  };

  loadContract = async () => {
    const { web3, accounts, contract } = this.state;
    
    const price = await contract.methods.getPrice().call();
    const balance = await web3.eth.getBalance(accounts[0]);
    const ptt = [];
    const tokens = await contract.methods.getNftByOwner(accounts[0]).call();
    
    if (tokens) {
      for (const tokenId of tokens) {
        let url = await contract.methods.tokenURI(tokenId).call();
        let usage = await contract.methods.getNftUsage(tokenId).call();
        let metadata = await this.fetchJson(url);

        let nft = {
          tokenId: tokenId,
          usage: usage,
          metadata: metadata
        }
        ptt.push(nft);
      }
    }
    const response = await contract.methods.getOwner().call();
    this.setState({
      accountBalance: web3.utils.fromWei(balance, 'ether') + ' ETH', 
      pttPrice: web3.utils.fromWei(price, 'ether'),
      pttTokens: ptt, 
      contractOwner: response 
    });
  };

  fetchJson = async (url) => {
    const response = await fetch(url);
    return await response.json();
  };

  buyNFT = async (price) => {
    const {web3, contract, accounts} = this.state;
    try {
      const response = await contract.methods.buyNft().send({value: web3.utils.toWei(price), from: accounts[0]});
    } catch (error) {
      console.log(error);
      alert('There was an error - View the console for details');
    }
    this.loadContract();
  };

  useNFT = async (tokenId) => {
    const {contract, accounts} = this.state;
    const response = await contract.methods.useToken(tokenId).send({from: accounts[0]});
    this.loadContract();
  };

  render() {
    const self = this;

    return (
      <Container className="App">
        <Row className="m-5">
          <Col>
            <h1>Web3 Demo</h1>
            {!this.state.web3 &&
              <div>
                <h2>No Wallet Detected</h2>
                <p>Please enable a wallet such as Metamask</p>
              </div>
            }
            {!this.state.accounts && this.state.web3 &&
              <Button 
                variant="primary"
                onClick={this.buttonClick}
              >
                CONNECT WALLET
              </Button>
            }
            {this.state.accounts &&
              <div>
                <h4 className="mb-0">Account</h4>
                <ul className="px-2 pt-0">
                  <li>
                    <small>Wallet: </small> 
                    <strong><a href={'https://rinkeby.etherscan.io/address/' + this.state.accounts[0]} target="_blank">{this.state.accounts[0]}</a></strong>
                  </li>
                  <li>
                    <small>Balance: </small> 
                    <strong>{this.state.accountBalance}</strong>
                  </li>
                  <li>
                    <small>PTT NFTs: </small> 
                    <strong>{this.state.pttTokens.length}</strong>
                  </li>
                </ul>
                <Button 
                  variant="success"
                  onClick={(e) => this.buyNFT(this.state.pttPrice)}
                >
                  BUY PTT NFT – {this.state.pttPrice} ETH
                </Button>
              </div>
            }
            <Row className="mt-4 p-1">
               {this.state.pttTokens.map(function(token,index){
                  return <Col key={index}>
                           <Card style={{ width: '18rem' }} className="mb-5">
                             <Card.Img variant="top" src={token.metadata.image} />
                             <Card.Body>
                               <Card.Title>Token {token.metadata.name}</Card.Title>
                               <Card.Text>
                                 {token.metadata.description}<br/>
                                 <small>Uses Remaining: {token.usage}</small>
                               </Card.Text>
                               <Button variant="primary" onClick={(e) => self.useNFT(token.tokenId)}>USE TOKEN</Button>
                             </Card.Body>
                           </Card> 
                         </Col>
                })}
            </Row>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default App;
