import BigNumber from 'bignumber.js';
import chai from 'chai';
import 'mocha';

import {
  makePolyToken,
  makeCompliance,
  makeCustomers,
  makeKYCProvider,
  makeLegalDelegate,
  makeTemplate,
  makeSecurityToken,
  makeSecurityTokenRegistrar,
  makeTemplateWithFinalized,
  makeSecurityTokenThroughRegistrar,
} from './util/make_examples';
import { makeWeb3Wrapper } from './util/web3';
import { fakeAddress } from './util/fake';

const { assert } = chai;

describe('Compliance wrapper', () => {
  const web3Wrapper = makeWeb3Wrapper();

  let accounts;
  let polyToken;
  let compliance;
  let customers;
  let securityToken;
  let registrar;

  before(async () => {
    //accounts[0] = owner
    //accounts[1] = kyc
    //accounts[2] = legal delegate

    accounts = await web3Wrapper.getAvailableAddressesAsync();
  });

  beforeEach(async () => {
    polyToken = await makePolyToken(web3Wrapper, accounts[0]);
    customers = await makeCustomers(web3Wrapper, polyToken, accounts[0]);
    compliance = await makeCompliance(web3Wrapper, customers, accounts[0]);


    securityToken = await makeSecurityTokenThroughRegistrar(
      web3Wrapper,
      polyToken,
      customers,
      compliance,
      securityToken,
      accounts[0],
      accounts[1],
    );


    // Fund three accounts.
    await polyToken.generateNewTokens(
      new BigNumber(10).toPower(18).times(100000),
      accounts[0],
    );
    await polyToken.generateNewTokens(
      new BigNumber(10).toPower(18).times(100000),
      accounts[1],
    );
    await polyToken.generateNewTokens(
      new BigNumber(10).toPower(18).times(100000),
      accounts[2],
    );
  });

  it('createTemplate', async () => {
    await makeKYCProvider(polyToken, customers, accounts[0], accounts[1]);
    await makeLegalDelegate(polyToken, customers, accounts[1], accounts[2]);
    const templateAddress = await makeTemplate(
      compliance,
      accounts[1],
      accounts[2],
    );

    assert.isAbove(templateAddress.length, 0);
  });

  it('proposeTemplate, templateReputation, getTemplateAddressByProposal, cancelTemplateProposal', async () => {
    await makeKYCProvider(polyToken, customers, accounts[0], accounts[1]);
    await makeLegalDelegate(polyToken, customers, accounts[1], accounts[2]);
    const templateAddress = await makeTemplateWithFinalized(
      compliance,
      accounts[1],
      accounts[2],
    );

    // Propose Template
    await compliance.proposeTemplate(accounts[2], securityToken.address, templateAddress);
    const logs = await compliance.getLogs('LogNewTemplateProposal', {}, { fromBlock: 1 });
    assert.equal(logs[0].args._template, templateAddress, 'Template address does not match the logged version');

    // Reputation
    let templateReputation = await compliance.getTemplateReputation(templateAddress);
    assert.equal(templateReputation.owner, accounts[2], "TemplateReputation not stored or read properly");

    // Get Template Address By Proposal
    // const address = compliance.getTemplateAddressByProposal(securityToken.address, )
    // assert.equal(address, templateAddress, 'Proposal returned the wrong template address');

    // Cancel Proposal
    // templateAddress.cancelTemplateProposal(accounts[2],securityToken.address, );

  });

  it('setSTO', async () => {
    await makeKYCProvider(polyToken, customers, accounts[0], accounts[1]);

    await compliance.setSTO(
      accounts[0],
      fakeAddress,
      new BigNumber(10),
      new BigNumber(9888888),
      new BigNumber(20),
    );
  });

  it('getMinimumVestingPeriod', async () => {
    let minimum = await compliance.getMinimumVestingPeriod();
    assert.equal(minimum, 60 * 60 * 24 * 100, "Does not equal 100 days, when it should")
  })

  // it('getTemplateReputation', async() => {

  // })

});
