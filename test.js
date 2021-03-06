'use strict';

const chai           = require('chai');
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.use(sinonChai);

chai.should();

const _       = require('lodash');
const fs      = require('fs');
const del     = require('del');
const rewire  = require('rewire');
const tarMock = require('./test/mocks/tarmock');

const extrakt = rewire('./');

const verifyExtraction = () => {
    _.forEach([
        'lib/index.js',
        'package.json',
        'readme.md',
        'test.js'
    ], file => fs.accessSync('test/extract/' + file));
};

describe('extrakt', () => {
    afterEach(() => del('test/extract'));
    describe('cross-platform compatibility', () => {
        let revert;
        let hasBinaryTar = sinon.stub();
        beforeEach(() => {
            sinon.stub(extrakt, 'system');
            sinon.stub(extrakt, 'native');
            revert = extrakt.__set__('hasBinaryTar', hasBinaryTar);
        });
        afterEach(() => {
            extrakt.system.restore();
            extrakt.native.restore();
            revert();
        });
        it('should invoke .system() if tar is found in PATH', () => {
            hasBinaryTar.resolves('/path/to/tar');
            return extrakt('test/archive.tar', 'test/extract').then(() => {
                extrakt.system.should.have.been.called;
                extrakt.native.should.have.not.been.called;
            });
        });
        it('should invoke .native() if tar is not found in PATH', () => {
            hasBinaryTar.resolves(false);
            return extrakt('test/archive.tar', 'test/extract').then(() => {
                extrakt.native.should.have.been.called;
                extrakt.system.should.have.not.been.called;
            });
        });
    });
    describe('auto', () => {
        it('should extract all the files from the .tar archive', () => {
            return extrakt('test/archive.tar', 'test/extract').then(() => verifyExtraction());
        });
        it('should extract all the files from the .tar.gz archive', () => {
            return extrakt('test/archive.tar.gz', 'test/extract').then(() => verifyExtraction());
        });
        it('should reject the promise if there\'s no file at the given path', () => {
            return extrakt('no/file/here.tar.gz', 'test/extract').should.be.rejected;
        });
    });
    describe('.native', () => {
        let revert;
        let tarExtract = sinon.spy();
        before(() => revert = extrakt.__set__('tar', tarMock(tarExtract)));
        after(() => revert());
        it('should call tar.extract', () => {
            return extrakt.native('test/archive.tar.gz', 'test/extract').then(() => {
                tarExtract.should.have.been.calledWith('test/extract');
            });
        });
    });
    describe('.system', () => {
        let revert;
        let execa = sinon.spy();
        before(() => revert = extrakt.__set__({execa}));
        after(() => revert());
        it('should issue the right command', () => {
            return extrakt.system('test/archive.tar.gz', 'test/extract').then(() => {
                execa.should.have.been.calledWith('tar', ['-xf', 'test/archive.tar.gz', '-C', 'test/extract']);
            });
        });
    });
});