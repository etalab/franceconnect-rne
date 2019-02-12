require('dotenv').config()

const {readFileSync} = require('fs')
const {groupBy, deburr, template} = require('lodash')
const express = require('express')
const passport = require('passport')
const session = require('express-session')
const elus = require('./elus.json')
const fcStrategy = require('./lib/franceconnect/strategy')

const dateNaissanceIndex = groupBy(elus, 'dateNaissance')
const app = express()

const homepage = template(readFileSync('pages/index.html', {encoding: 'utf8'}))

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

app.use(session({secret: 'foobar', saveUninitialized: false, resave: false}))
app.use(passport.initialize())
app.use(passport.session())

passport.use('franceconnect', fcStrategy)

app.get('/fc', passport.authenticate('franceconnect'))

app.get('/fc/callback', passport.authenticate('franceconnect', {failureRedirect: '/'}), (req, res) => {
  res.redirect('/')
})

app.get('/logout', (req, res) => {
  const {idToken} = req.user
  req.logout()
  res.redirect(`${process.env.FC_SERVICE_URL}/api/v1/logout?id_token_hint=${idToken}&state=foobar&post_logout_redirect_uri=${encodeURIComponent(process.env.ROOT_URL)}`)
})

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(homepage({
    identite: req.user,
    elu: req.user ? findElu(req.user) : undefined
  }))
})

function findElu({dateNaissance, nomNaissance, prenom, sexe}) {
  const nNomNaissance = normalize(nomNaissance)
  const nPrenom = normalize(prenom)
  return (dateNaissanceIndex[dateNaissance] || [])
    .find(c => c.sexe === sexe && normalize(c.nomNaissance) === nNomNaissance && normalize(c.prenom) === nPrenom)
}

app.listen(5000)
